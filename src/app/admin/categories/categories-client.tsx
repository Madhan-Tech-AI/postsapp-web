'use client'

import React, { useState, useActionState } from 'react'
import { upsertCategoryAction } from '@/modules/admin/actions'
import type { CategoryGroup } from '@/modules/admin/categories.service'

interface CategoriesClientProps {
  initialGroups: CategoryGroup[]
}

export function CategoriesClient({ initialGroups }: CategoriesClientProps) {
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(upsertCategoryAction, {
    success: false,
  })

  function openNewModal() {
    setEditingGroup(null)
    setIsModalOpen(true)
  }

  function openEditModal(group: CategoryGroup) {
    setEditingGroup(group)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Categories maintain paired bilingual identity: English + தமிழ் per group key.
        </p>
        <button
          type="button"
          onClick={openNewModal}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          + Add Category Group
        </button>
      </div>

      {state.error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Category group successfully saved.
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-3 font-semibold">Group Key</th>
                <th className="p-3 font-semibold">Order</th>
                <th className="p-3 font-semibold">English Name & Slug</th>
                <th className="p-3 font-semibold">Tamil Name & Slug</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {initialGroups.map((group) => (
                <tr key={group.groupKey} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="p-3 font-mono font-bold text-primary-600">
                    {group.groupKey}
                  </td>
                  <td className="p-3 font-mono text-gray-500">{group.sortOrder}</td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{group.en.name}</div>
                    <div className="text-[11px] font-mono text-gray-400">/{group.en.slug}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{group.ta.name}</div>
                    <div className="text-[11px] font-mono text-gray-400">/{group.ta.slug}</div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditModal(group)}
                      className="px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 rounded"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {editingGroup ? `Edit Category (${editingGroup.groupKey})` : 'New Category Group'}
            </h3>

            <form
              action={async (formData) => {
                await formAction(formData)
                setIsModalOpen(false)
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Group Key</label>
                  <input
                    type="text"
                    name="group_key"
                    defaultValue={editingGroup?.groupKey || ''}
                    placeholder="e.g. politics"
                    required
                    readOnly={!!editingGroup}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    defaultValue={editingGroup?.sortOrder ?? 10}
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-xs"
                  />
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] tracking-wider">
                  English Edition
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      name="name_en"
                      defaultValue={editingGroup?.en.name || ''}
                      placeholder="e.g. Politics"
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Slug</label>
                    <input
                      type="text"
                      name="slug_en"
                      defaultValue={editingGroup?.en.slug || ''}
                      placeholder="e.g. politics"
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] tracking-wider">
                  Tamil Edition (தமிழ்)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      name="name_ta"
                      defaultValue={editingGroup?.ta.name || ''}
                      placeholder="e.g. அரசியல்"
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">Slug</label>
                    <input
                      type="text"
                      name="slug_ta"
                      defaultValue={editingGroup?.ta.slug || ''}
                      placeholder="e.g. politics"
                      required
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg"
                >
                  {isPending ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
