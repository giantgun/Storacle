'use client'

import { useState } from 'react'
import { logout, updateUserProfile } from '@/lib/actions/profile'
import BaseModal from '@/components/modals/BaseModal'
import ProfileForm from '@/components/forms/profile/ProfileForm'

export interface FullProfile {
  org_name: string
  org_id: string
  first_name: string
  last_name: string
  business_email: string
  smart_account_address: string
  is_agent_active?: boolean
}

interface ProfileSectionProps {
  profile: FullProfile
  onUpdateProfile: (profile: Omit<FullProfile, 'smart_account_address' | 'is_agent_active'>) => void
}

export default function ProfileSection({ profile, onUpdateProfile }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    firstName: profile.first_name,
    lastName: profile.last_name,
    businessName: profile.org_name,
    email: profile.business_email,
  })
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const updated: Omit<FullProfile, 'smart_account_address' | 'is_agent_active'> = {
        first_name: editData.firstName,
        last_name: editData.lastName,
        org_name: editData.businessName,
        org_id: profile.org_id,
        business_email: editData.email,
      }
      const result = await updateUserProfile({
        orgName: editData.businessName,
        firstName: editData.firstName,
        lastName: editData.lastName,
        businessEmail: editData.email,
      })
      if (!result.success) {
        console.error('Failed to save profile to server')
        return
      }
      onUpdateProfile(updated)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    try {
      const response = await logout()
      if (response.success) {
        // Redirect to onboarding page after logout
        window.location.href = '/onboarding'
      }
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your organization and account details</p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded border border-border hover:border-primary/30 bg-card/50"
        >
          Edit Profile
        </button>
      </div>

      {/* Profile Display Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info Card */}
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {profile.first_name.charAt(0).toUpperCase()}{profile.last_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 space-y-2 ml-4">
                <p className="text-lg font-bold text-foreground">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{profile.org_name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.business_email}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Smart Account</span>
                  <span className="text-sm font-mono text-muted-foreground">{profile.smart_account_address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Account Status</span>
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-medium text-xs">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
          <div className="space-y-5">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
              <p className="text-sm text-muted-foreground">
                Manage your profile and account settings
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setIsEditing(true)}
                className="w-full px-5 py-3 bg-primary text-primary-foreground text-base font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Update Profile Information
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full px-5 py-3 bg-destructive/20 text-destructive text-base font-medium rounded-lg hover:bg-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
    <BaseModal
      isOpen={isEditing}
      title="Edit Profile"
      onClose={() => setIsEditing(false)}
      actions={
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-5 py-3 bg-border text-foreground text-base font-medium rounded-lg hover:bg-border/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-primary text-primary-foreground text-base font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <ProfileForm
        formData={editData}
        onChange={data => setEditData({ ...editData, ...data })}
      />
    </BaseModal>
   </div>
  )
}
