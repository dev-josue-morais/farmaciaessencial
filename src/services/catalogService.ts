import type { Category, Product } from '../types'
import { supabase } from './supabase'

export async function getCatalog(): Promise<{ categories: Category[]; products: Product[] }> {
  if (!supabase) return { categories: [], products: [] }

  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }] =
    await Promise.all([
      supabase.from('categories').select('*').eq('active', true).order('sort_order'),
      supabase.from('products').select('*').eq('status', 'active').order('name'),
    ])

  if (categoryError) throw categoryError
  if (productError) throw productError

  return {
    categories: (categoryRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      active: row.active,
      sortOrder: row.sort_order,
    })),
    products: (productRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      promotionalPrice: row.promotional_price == null ? undefined : Number(row.promotional_price),
      categoryId: row.category_id,
      code: row.code,
      stock: row.stock,
      imageUrl: row.image_url ?? '',
      gallery: row.gallery ?? [],
      status: row.status,
      featured: row.featured,
      requiresPrescription: row.requires_prescription,
      controlled: row.controlled,
    })),
  }
}
