create table posts (
  id integer primary key autoincrement,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  cover_image text not null,
  published_at integer not null,
  updated_at integer not null
);

create index posts_published_at_idx on posts (published_at);
