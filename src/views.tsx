import type { FC } from "hono/jsx";
import type { Actor, User, Post } from "./schema.ts";

export interface ProfileProps {
  name: string;
  username: string;
  handle: string;
  followers: number;
  following: number;
}

export interface FollowerListProps {
  followers: Actor[];
}

export interface ActorLinkProps {
  actor: Actor;
}

export interface HomeProps {
  user: User & Actor;
}

export interface PostViewProps {
  post: Post & Actor;
}

export interface PostPageProps extends ProfileProps, PostViewProps {}

export interface PostListProps {
  posts: (Post & Actor)[];
}

export interface FollowingListProps {
  following: Actor[];
}

export interface PostPageProps extends ProfileProps, PostViewProps {}

export interface HomeProps extends PostListProps {
  user: User & Actor;
}

export const Layout: FC = (props) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <title>Microblog</title>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
      />
    </head>
    <body>
      <main class="container">{props.children}</main>
    </body>
  </html>
);

export const SetupForm: FC = () => (
  <>
    <h1>Set up your microblog</h1>
    <form method="post" action="/setup">
      <fieldset>
        <label>
          Username{" "}
          <input
            type="text"
            name="username"
            required
            maxlength={50}
            pattern="^[a-z0-9_\-]+$"
          />
        </label>
        <label>
          Name <input type="text" name="name" required />
        </label>
      </fieldset>
      <input type="submit" value="Setup" />
    </form>
  </>
);

export const Profile: FC<ProfileProps> = ({ name, handle, username, followers, following }) => (
  <hgroup>
    <h1>{name}</h1>
    <p style="user-select: all;">        
      <span style="user-select: all;">{handle}</span> &middot;{" "}
      <a href={`/users/${username}/following`}>{following} following</a>{" "}
       &middot;{" "}
        <a href={`/users/${username}/followers`}>
          {followers === 1 ? "1 follower" : `${followers} followers`}
        </a>
    </p>
  </hgroup>
);

export const FollowerList: FC<FollowerListProps> = ({ followers }) => (
  <>
    <h2>Followers</h2>
    <ul>
      {followers.map((follower) => (
        <li key={follower.id}>
          <ActorLink actor={follower} />
        </li>
      ))}
    </ul>
  </>
);

export const ActorLink: FC<ActorLinkProps> = ({ actor }) => {
  const href = actor.url ?? actor.uri;
  return actor.name == null ? (
    <a href={href} class="secondary">
      {actor.handle}
    </a>
  ) : (
    <>
      <a href={href}>{actor.name}</a>{" "}
      <small>
        (
        <a href={href} class="secondary">
          {actor.handle}
        </a>
        )
      </small>
    </>
  );
};

export const Home: FC<HomeProps> = ({ user, posts }) => (
  <>
    <hgroup>
      <h1>{user.name}'s microblog</h1>
      <p>
        <a href={`/users/${user.username}`}>{user.name}'s profile</a>
      </p>
    </hgroup>
    <form method="post" action={`/users/${user.username}/following`}>
      {/* biome-ignore lint/a11y/noRedundantRoles: PicoCSS가 role=group을 요구함 */}
      <fieldset role="group">
        <input
          type="text"
          name="actor"
          required={true}
          placeholder="Enter an actor handle (e.g., @johndoe@mastodon.com) or URI (e.g., https://mastodon.com/@johndoe)"
        />
        <input type="submit" value="Follow" />
      </fieldset>
    </form>
    <form method="post" action={`/users/${user.username}/posts`}>
      <fieldset>
        <label>
          <textarea name="content" required={true} placeholder="What's up?" />
        </label>
      </fieldset>
      <input type="submit" value="Post" />
    </form>
    <PostList posts={posts} />
  </>
);

export const PostPage: FC<PostPageProps> = (props) => (
  <>
    <Profile
      name={props.name}
      username={props.username}
      handle={props.handle}
      followers={props.followers}
      following={props.following}
    />
    <PostView post={props.post} />
  </>
);

export const PostView: FC<PostViewProps> = ({ post }) => (
  <article>
    <header>
      <ActorLink actor={post} />
    </header>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: */}
    <div dangerouslySetInnerHTML={{ __html: post.content }} />
    <footer>
      <a href={post.url ?? post.uri}>
        <time datetime={new Date(post.created).toISOString()}>
          {post.created}
        </time>
      </a>
    </footer>
  </article>
);

export const PostList: FC<PostListProps> = ({ posts }) => (
  <>
    {posts.map((post) => (
      <div key={post.id}>
        <PostView post={post} />
      </div>
    ))}
  </>
);

export const FollowingList: FC<FollowingListProps> = ({ following }) => (
  <>
    <h2>Following</h2>
    <ul>
      {following.map((actor) => (
        <li key={actor.id}>
          <ActorLink actor={actor} />
        </li>
      ))}
    </ul>
  </>
);