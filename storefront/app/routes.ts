import { del, get, post, put, route, form, resources } from 'remix/routes'

export const assetsBase = '/assets'

export const routes = route({
  assets: `${assetsBase}/*path`,
  fragments: route('fragments', {
    cartButton: get('/cart-button/:bookId'),
    cartItems: get('/cart-items'),
  }),
  api: route('api', {
    cartToggle: post('/cart/toggle'),
  }),

  // Simple static routes
  home: '/',
  about: '/about',
  contact: form('contact'),
  search: '/search',

  // Public book routes
  books: {
    index: '/books',
    genre: '/books/genre/:genre',
    show: '/books/:slug',
  },

  // Blog routes (sourced from the MinCMS posts API)
  blog: {
    index: '/blog',
    show: '/blog/:slug',
  },

  // Auth routes
  auth: {
    login: form('login'),
    register: form('register'),
    logout: post('logout'),
    forgotPassword: form('forgot-password'),
    resetPassword: form('reset-password/:token'),
  },

  // Account section (protected, nested routes)
  account: route('account', {
    index: '/',
    settings: form('settings', {
      formMethod: 'PUT',
      names: {
        action: 'update',
      },
    }),

    // Orders as nested resources with custom param
    orders: resources('orders', {
      only: ['index', 'show'], // Read-only, no create/edit/delete
      param: 'orderId',
    }),
  }),

  // Cart and shopping
  cart: route('cart', {
    index: get('/'),

    // API-style endpoints under /cart/api
    api: {
      add: post('/api/add'),
      update: put('/api/update'),
      remove: del('/api/remove'),
    },
  }),

  // Checkout flow
  checkout: route('checkout', {
    index: get('/'),
    action: post('/'),
    confirmation: get('/:orderId/confirmation'),
  }),
})
