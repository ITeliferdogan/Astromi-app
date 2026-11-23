import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  // Yönlendirme işlemi _layout.tsx içinde yapılıyor.
  // Burası sadece geçiş sırasında boş bir ekran gösterir.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}