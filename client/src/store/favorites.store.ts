import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoriteItem {
  path: string
  label: string
  icon?: string
}

interface FavoritesState {
  favorites: FavoriteItem[]
  addFavorite: (path: string, label: string, icon?: string) => void
  removeFavorite: (path: string) => void
  isFavorite: (path: string) => boolean
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      addFavorite: (path, label, icon) =>
        set((state) => {
          if (state.favorites.some((f) => f.path === path)) return state
          return { favorites: [...state.favorites, { path, label, icon }] }
        }),
      removeFavorite: (path) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.path !== path),
        })),
      isFavorite: (path) => get().favorites.some((f) => f.path === path),
    }),
    { name: 'maghil-favorites' }
  )
)
