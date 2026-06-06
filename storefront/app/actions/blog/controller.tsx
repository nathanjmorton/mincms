import { createController } from 'remix/router'

import { posts } from '../../data/schema.ts'
import { routes } from '../../routes.ts'
import { BlogIndexPage } from './index-page.tsx'
import { BlogShowPage, BlogPostNotFoundPage } from './show-page.tsx'

export default createController(routes.blog, {
  actions: {
    async index({ db, render }) {
      let allPosts = await db.findMany(posts, { orderBy: ['published_at', 'desc'] })
      return render(<BlogIndexPage posts={allPosts} />)
    },

    async show({ db, params, render }) {
      let post = await db.findOne(posts, { where: { slug: params.slug } })

      if (!post) {
        return render(<BlogPostNotFoundPage />, { status: 404 })
      }

      return render(<BlogShowPage post={post} />)
    },
  },
})
