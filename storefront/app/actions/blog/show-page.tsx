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

export interface BlogShowPageProps {
  post: Post
}

export function BlogShowPage(handle: Handle<BlogShowPageProps>) {
  return () => {
    let { post } = handle.props

    return (
      <Layout title={post.title}>
        <article mix={css({ maxWidth: '760px', margin: '0 auto' })}>
          <p mix={css({ marginBottom: '1rem' })}>
            <a href={routes.blog.index.href()} class="btn btn-secondary">
              ← Back to Blog
            </a>
          </p>

          <h1 mix={css({ fontSize: '2.25rem', marginBottom: '0.5rem' })}>{post.title}</h1>
          <p mix={css({ color: '#95a5a6', marginBottom: '1.5rem' })}>
            {formatDate(post.published_at)}
          </p>

          {post.cover_image ? (
            <img
              src={post.cover_image}
              alt={post.title}
              mix={css({
                width: '100%',
                maxHeight: '420px',
                objectFit: 'cover',
                borderRadius: '8px',
                marginBottom: '2rem',
              })}
            />
          ) : null}

          <div
            class="card"
            mix={css({ lineHeight: 1.8, fontSize: '1.05rem' })}
            innerHTML={post.content}
          />
        </article>
      </Layout>
    )
  }
}

export function BlogPostNotFoundPage() {
  return () => (
    <Layout title="Post Not Found">
      <div class="card">
        <h1>Post Not Found</h1>
        <p mix={css({ marginTop: '1rem' })}>
          <a href={routes.blog.index.href()} class="btn">
            Back to Blog
          </a>
        </p>
      </div>
    </Layout>
  )
}
