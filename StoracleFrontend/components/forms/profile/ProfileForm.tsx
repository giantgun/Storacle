'use client'

import FormInput from '../inputs/FormInput'

interface ProfileFormData {
  firstName: string
  lastName: string
  businessName: string
  email: string
}

interface ProfileFormProps {
  formData: ProfileFormData
  onChange: (data: Partial<ProfileFormData>) => void
}

export default function ProfileForm({ formData, onChange }: ProfileFormProps) {
  const handleInputChange = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: e.target.value })
  }

  return (
    <div className="space-y-3">
      <FormInput
        id="firstName"
        label="First Name"
        value={formData.firstName}
        onChange={handleInputChange('firstName')}
        required
      />
      <FormInput
        id="lastName"
        label="Last Name"
        value={formData.lastName}
        onChange={handleInputChange('lastName')}
        required
      />
      <FormInput
        id="businessName"
        label="Business Name"
        value={formData.businessName}
        onChange={handleInputChange('businessName')}
        required
      />
      <FormInput
        id="email"
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleInputChange('email')}
        required
      />
    </div>
  )
}
