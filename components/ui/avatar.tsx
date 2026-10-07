import * as React from 'react';

import {
  AvatarFallback,
  AvatarImage,
  AvatarRoot,
} from '@/components/ui/avatar-parts';

export { useAvatar } from '@/components/ui/avatar-parts';

/**
 * heroui-native's `<Avatar>` / `<Avatar.Image>` / `<Avatar.Fallback>` anatomy.
 * A plain function with static members rather than Object.assign on the client
 * component, so server components can use `Avatar.Image` too. See
 * ./avatar-parts for the implementation.
 */
function Avatar(props: React.ComponentProps<typeof AvatarRoot>) {
  return <AvatarRoot {...props} />;
}
Avatar.Image = AvatarImage;
Avatar.Fallback = AvatarFallback;

export { Avatar };
export default Avatar;
