import type { Handle } from 'remix/ui'
import { css } from 'remix/ui'

import type { Post } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { Layout } from '../../ui/layout.tsx'

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export interface BlogIndexPageProps {
  posts: Post[]
}

export function BlogIndexPage(handle: Handle<BlogIndexPageProps>) {
  return () => {
    let { posts } = handle.props

    return (
      <Layout title="Blog">
        <h1>Blog</h1>
        <p mix={css({ margin: '0.5rem 0 2rem', color: '#7f8c8d' })}>
          Posts published from MinCMS.
        </p>

        {posts.length === 0 ? (
          <div class="card">
            <p>No posts yet. Publish one in the MinCMS admin and it will appear here.</p>
          </div>
        ) : (
          <div mix={css({ display: 'grid', gap: '1.5rem' })}>
            {posts.map((post) => (
              <article class="card" data-test-slug={post.slug}>
                <div
                  mix={css({
                    display: 'grid',
                    gridTemplateColumns: post.cover_image ? '200px 1fr' : '1fr',
                    gap: '1.5rem',
                    alignItems: 'start',
                  })}
                >
                  {post.cover_image ? (
                    <a href={routes.blog.show.href({ slug: post.slug })}>
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        mix={css({
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                        })}
                      />
                    </a>
                  ) : null}
                  <div>
                    <h2 mix={css({ marginBottom: '0.25rem' })}>
                      <a
                        href={routes.blog.show.href({ slug: post.slug })}
                        mix={css({ textDecoration: 'none', color: '#2c3e50' })}
                      >
                        {post.title}
                      </a>
                    </h2>
                    <p mix={css({ color: '#95a5a6', fontSize: '0.875rem', marginBottom: '0.75rem' })}>
                      {formatDate(post.published_at)}
                    </p>
                    <p mix={css({ marginBottom: '1rem' })}>{post.excerpt}</p>
                    <a href={routes.blog.show.href({ slug: post.slug })} class="btn">
                      Read more
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Layout>
    )
  }
}
