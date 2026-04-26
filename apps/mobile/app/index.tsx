import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Knot</Text>
        <Text style={styles.tagline}>El dating no se ve, se siente.</Text>
      </View>

      <View style={styles.apps}>
        <AppCard
          name="Voice"
          description="Te enamoras escuchando, no mirando."
          onPress={() => router.push('/voice')}
        />
        <AppCard
          name="Words"
          description="Tu manera de pensar es el perfil."
          onPress={() => router.push('/words')}
        />
        <AppCard
          name="Match"
          description="Un agente que conoce a ambos."
          onPress={() => router.push('/match')}
        />
      </View>
    </SafeAreaView>
  );
}

function AppCard({
  name,
  description,
  onPress,
}: {
  name: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.cardName}>{name}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa', paddingHorizontal: 24 },
  header: { paddingTop: 48, paddingBottom: 32 },
  brand: { fontSize: 32, fontWeight: '500', color: '#111' },
  tagline: { fontSize: 16, color: '#666', marginTop: 8 },
  apps: { gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardName: { fontSize: 20, fontWeight: '500', color: '#111', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#666' },
});
