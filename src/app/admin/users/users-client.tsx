'use client'

import { useState, useTransition } from 'react'
import { changeRoleAction, toggleActiveAction, inviteStaffAction } from '@/modules/auth/actions'
import type { UserRole } from '@/lib/schemas'

interface EnrichedUser {
  id: string
  email: string
  display_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

interface UsersClientProps {
  initialUsers: EnrichedUser[]
  currentUserId: string
}

export function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<EnrichedUser[]>(initialUsers)
  const [filterRole, setFilterRole] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole
    const matchesSearch =
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchesRole && matchesSearch
  })

  // Handle Role Change
  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setActionError(null)
    startTransition(async () => {
      const result = await changeRoleAction(targetUserId, newRole)
      if (!result.success) {
        setActionError(result.error || 'Failed to update role')
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        )
      }
    })
  }

  // Handle Toggle Active Status
  const handleToggleActive = async (targetUserId: string, currentStatus: boolean) => {
    setActionError(null)
    const newStatus = !currentStatus
    startTransition(async () => {
      const result = await toggleActiveAction(targetUserId, newStatus)
      if (!result.success) {
        setActionError(result.error || 'Failed to update user status')
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, is_active: newStatus } : u))
        )
      }
    })
  }

  // Handle Invite Form Submission
  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await inviteStaffAction(null, formData)
      if (!result.success) {
        setInviteError(result.error || 'Failed to send invite')
      } else {
        setInviteSuccess(result.message || 'Invitation sent successfully!')
        setTimeout(() => {
          setShowInviteModal(false)
          setInviteSuccess(null)
        }, 2000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User & Role Management
          </h1>
          <p className="text-sm text-gray-500">
            Manage platform members, assign editorial roles, and invite staff.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Invite Staff Member
        </button>
      </div>

      {actionError && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
        >
          <option value="all">All Roles</option>
          <option value="reader">Reader</option>
          <option value="author">Author</option>
          <option value="editor">Editor</option>
          <option value="super_admin">SuperAdmin</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Joined</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No users found matching your filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {user.display_name}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-primary-600 font-semibold">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      disabled={isPending || user.id === currentUserId}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      className="px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-transparent focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="reader">Reader</option>
                      <option value="author">Author</option>
                      <option value="editor">Editor</option>
                      <option value="super_admin">SuperAdmin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        disabled={isPending}
                        className={`text-xs font-medium hover:underline ${
                          user.is_active ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              Invite Staff Member
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Sends an invitation email with a secure set-password link. Plaintext passwords are never used.
            </p>

            {inviteError && (
              <div role="alert" className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div role="status" className="mb-3 p-3 bg-green-50 text-green-700 text-xs rounded-lg">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="writer@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  required
                  placeholder="Writer Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Role
                </label>
                <select
                  name="role"
                  defaultValue="author"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
                >
                  <option value="author">Author (Create/edit own articles)</option>
                  <option value="editor">Editor (Edit all, publish, delete)</option>
                  <option value="super_admin">SuperAdmin (Full control)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                >
                  {isPending ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
