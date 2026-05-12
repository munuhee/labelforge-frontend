import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth'
import tasksReducer from './features/tasks'
import batchesReducer from './features/batches'
import workflowsReducer from './features/workflows'
import usersReducer from './features/users'
import clientsReducer from './features/clients'
import membershipsReducer from './features/memberships'
import notificationsReducer from './features/notifications'
import analyticsReducer from './features/analytics'
import reviewsReducer from './features/reviews'
import projectsReducer from './features/projects'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: tasksReducer,
    batches: batchesReducer,
    workflows: workflowsReducer,
    users: usersReducer,
    clients: clientsReducer,
    memberships: membershipsReducer,
    notifications: notificationsReducer,
    analytics: analyticsReducer,
    reviews: reviewsReducer,
    projects: projectsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
