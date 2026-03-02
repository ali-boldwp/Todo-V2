import React from 'react';

type UserAvatarProps = {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string | null;
    sizeClassName?: string;
    textClassName?: string;
    fallbackClassName?: string;
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    firstName,
    lastName,
    email,
    profileImageUrl,
    sizeClassName = 'w-8 h-8',
    textClassName = 'text-xs',
    fallbackClassName = 'bg-indigo-600 text-white',
}) => {
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || (email?.[0] || 'U').toUpperCase();

    return (
        <div className={`${sizeClassName} rounded-full overflow-hidden flex items-center justify-center ${fallbackClassName}`}>
            {profileImageUrl ? (
                <img
                    src={profileImageUrl}
                    alt={`${firstName || ''} ${lastName || ''}`.trim() || 'User avatar'}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className={`font-semibold ${textClassName}`}>{initials}</span>
            )}
        </div>
    );
};

export default UserAvatar;
