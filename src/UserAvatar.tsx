type UserAvatarProps = {
  size?: 'small' | 'default' | 'large'
  className?: string
}

const DEFAULT_PROFILE_IMAGE = '/profile/default-avatar.png'

export function UserAvatar({ size = 'default', className = '' }: UserAvatarProps) {
  const sizeClass = size === 'default' ? '' : size
  const classes = ['user-avatar', sizeClass, className].filter(Boolean).join(' ')

  return (
    <span className={classes} aria-hidden="true">
      <img src={DEFAULT_PROFILE_IMAGE} alt="" />
    </span>
  )
}

export { DEFAULT_PROFILE_IMAGE }
