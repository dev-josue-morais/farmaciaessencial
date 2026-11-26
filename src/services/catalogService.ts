import type { Category, Product } from '../types'
import { supabase } from './supabase'

export async function getCatalog(): Promise<{ categories: Category[]; products: Product[]; settings: Record<string, unknown> }> {
  if (!supabase) return { categories: [], products: [], settings: {} }

  const [{ data: categoryRows, error: categoryError }, { data: productRows, error: productError }, { data: settingsRows }] =
    await Promise.all([
      supabase.from('categories').select('*').eq('active', true).order('sort_order'),
      supabase.from('products').select('*').eq('status', 'active').order('name'),
      supabase.from('store_settings').select('*').eq('id', true).maybeSingle(),
    ])

  if (categoryError) throw categoryError
  if (productError) throw productError

  const settings = settingsRows as Record<string, unknown> | null
  const promotionsEnabled = settings?.promotions_enabled !== false
  const showOutOfStock = settings?.show_out_of_stock !== false
  const featuredEnabled = settings?.featured_enabled !== false

  return {
    settings: (settingsRows as Record<string, unknown> | null) ?? {},
    categories: (categoryRows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      active: row.active,
      sortOrder: row.sort_order,
      description: row.description,
      imageUrl: row.image_url,
    })),
    products: (productRows ?? [])
      .filter((row) => row.available_for_sale !== false)
      .filter((row) => showOutOfStock || Number(row.stock) > 0)
      .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      promotionalPrice: promotionsEnabled && row.promotional_price != null ? Number(row.promotional_price) : undefined,
      categoryId: row.category_id,
      code: row.code,
      stock: row.stock,
      imageUrl: row.image_url ?? '',
      gallery: row.gallery ?? [],
      status: row.status,
      featured: row.featured,
      requiresPrescription: row.requires_prescription,
      controlled: row.controlled,
      minimumStock: row.minimum_stock,
      availableForSale: row.available_for_sale,
      regulatoryClass: row.regulatory_class,
      internalNotes: row.internal_notes,
    })).map((product) => featuredEnabled ? product : { ...product, featured: false }),
  }
}
