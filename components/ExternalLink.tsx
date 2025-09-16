import { openBrowserAsync } from 'expo-web-browser';
import { TouchableOpacity, Text, Platform } from 'react-native';
import { type ComponentProps } from 'react';

type Props = {
  href: string;
  children: React.ReactNode;
  style?: any;
};

export function ExternalLink({ href, children, style, ...rest }: Props) {
  const handlePress = async () => {
    if (Platform.OS !== 'web') {
      // Open the link in an in-app browser on native platforms
      await openBrowserAsync(href);
    } else {
      // On web, let the default behavior handle it
      window.open(href, '_blank');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={style} {...rest}>
      {children}
    </TouchableOpacity>
  );
}
