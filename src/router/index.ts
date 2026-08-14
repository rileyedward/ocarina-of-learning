import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'library',
      component: () => import('@/views/LibraryView.vue'),
    },
    {
      path: '/song/new',
      name: 'song-new',
      component: () => import('@/views/SongEditorView.vue'),
    },
    {
      path: '/song/:id',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
    },
    {
      path: '/song/:id/edit',
      name: 'song-edit',
      component: () => import('@/views/SongEditorView.vue'),
    },
    {
      path: '/reference',
      name: 'reference',
      component: () => import('@/views/ReferenceView.vue'),
    },
    {
      path: '/scales',
      name: 'scales',
      component: () => import('@/views/ScalesView.vue'),
    },
    {
      path: '/scales/:id',
      name: 'scale',
      component: () => import('@/views/ScaleView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
