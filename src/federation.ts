import { createFederation, Person, Endpoints, exportJwk, generateCryptoKeyPair, importJwk } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import db from './db.ts';
import type { Actor, User, Key } from './schema.ts';

const logger = getLogger("microblog");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  const user = db
    .prepare<unknown[], User & Actor>(
      `
      SELECT * FROM users
      JOIN actors ON (users.id = actors.user_id)
      WHERE users.username = ?
      `,
    )
    .get(identifier);
  if (user == null) return null;

  const keys = await ctx.getActorKeyPairs(identifier);
  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: identifier,
    name: user.name,
    inbox: ctx.getInboxUri(identifier),
    endpoints: new Endpoints({
      sharedInbox: ctx.getInboxUri(),
    }),
    url: ctx.getActorUri(identifier),
    publicKey: keys[0].cryptographicKey,
    assertionMethods: keys.map((k) => k.multikey),
  });
})
// setKeyPairsDispatcher() - 콜백 함수에서 반환된 키 쌍들을 계정에 연결하는 역할
// 키 쌍들을 연결해야 Fedify가 액티비티를 발신할 때 자동으로 등록된 개인 키들로 디지털 서명을 추가
.setKeyPairsDispatcher(async (ctx, identifier) => {
  const user = db
    .prepare<unknown[], User>("SELECT * FROM users WHERE username = ?")
    .get(identifier);
  if (user == null) return [];
  const rows = db
    .prepare<unknown[], Key>("SELECT * FROM keys WHERE keys.user_id = ?")
    .all(user.id);
  const keys = Object.fromEntries(
    rows.map((row) => [row.type, row]),
  ) as Record<Key["type"], Key>;
  const pairs: CryptoKeyPair[] = [];
  // 사용자가 지원하는 두 키 형식 (RSASSA-PKCS1-v1_5 및 Ed25519) 각각에 대해
  // 키 쌍을 보유하고 있는지 확인하고, 없으면 생성 후 데이터베이스에 저장:
  for (const keyType of ["RSASSA-PKCS1-v1_5", "Ed25519"] as const) {
    if (keys[keyType] == null) {
      logger.debug(
        "The user {identifier} does not have an {keyType} key; creating one...",
        { identifier, keyType },
      );
      const { privateKey, publicKey } = await generateCryptoKeyPair(keyType);
      db.prepare(
        `
        INSERT INTO keys (user_id, type, private_key, public_key)
        VALUES (?, ?, ?, ?)
        `,
      ).run(
        user.id,
        keyType,
        // JWK -> 암호 키를 JSON으로 표현하는 표준적인 형식
        JSON.stringify(await exportJwk(privateKey)),
        JSON.stringify(await exportJwk(publicKey)),
      );
      pairs.push({ privateKey, publicKey });
    } else {
      pairs.push({
        privateKey: await importJwk(
          JSON.parse(keys[keyType].private_key),
          "private",
        ),
        publicKey: await importJwk(
          JSON.parse(keys[keyType].public_key),
          "public",
        ),
      });
    }
  }
  return pairs;
});

federation.setInboxListeners("/users/{identifier}/inbox", "/inbox");

export default federation;
