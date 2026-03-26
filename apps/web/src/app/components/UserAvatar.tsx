import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface UserAvatarProps {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string;
    sizeClassName?: string;
    textClassName?: string;
    className?: string;
}

export function UserAvatar({
    firstName,
    lastName,
    email,
    profileImageUrl,
    sizeClassName = 'w-8 h-8',
    textClassName = 'text-xs',
    className = '',
}: UserAvatarProps) {
    const initials = [
        firstName?.charAt(0),
        lastName?.charAt(0),
    ]
        .filter(Boolean)
        .join('')
        .toUpperCase() || email?.charAt(0).toUpperCase() || '?';

    return (
        <Avatar className={`${sizeClassName} ${className}`}>
            {profileImageUrl && (
                <AvatarImage src={profileImageUrl} alt={`${firstName} ${lastName}`} />
            )}
            <AvatarFallback className={textClassName}>
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}

export default UserAvatar;