import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Alerta = {
  id: number | string;
  idEquipamento: number | string;
  descricao: string;
  statusAlerta: string;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Alertas';

export default function DashboardScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    const buscarAlertas = async () => {
      const token = await SecureStore.getItemAsync('jwtToken');

      if (!token) {
        router.replace('/?erro=sessao' as never);
        return;
      }

      try {
        const response = await axios.get<Alerta[]>(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ativo) setAlertas(response.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          await SecureStore.deleteItemAsync('jwtToken');
          router.replace('/?erro=sessao' as never);
        } else {
          console.error('Erro ao buscar alertas:', error);
        }
      } finally {
        if (ativo) setLoading(false);
      }
    };

    buscarAlertas();
    const intervalo = setInterval(buscarAlertas, 5000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [router]);

  const sair = async () => {
    await SecureStore.deleteItemAsync('jwtToken');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SIMAPRIND</Text>
          <Text>Monitoramento Industrial Preditivo</Text>
        </View>
        <Pressable onPress={sair} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#208AEF" style={styles.loading} />
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.equipment}>Equipamento ID: {item.idEquipamento}</Text>
              <Text style={styles.description}>{item.descricao}</Text>
              <Text style={styles.status}>Status: {item.statusAlerta}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum alerta pendente no momento.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 20 },
  title: { color: '#333', fontSize: 24, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#c0392b', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  loading: { marginTop: 50 },
  card: { backgroundColor: '#fff', borderColor: '#ddd', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 15 },
  equipment: { color: '#d9534f', fontSize: 16, fontWeight: 'bold' },
  description: { color: '#333', fontSize: 14, marginVertical: 5 },
  status: { color: '#666', fontSize: 12, fontStyle: 'italic' },
  empty: { color: '#888', marginTop: 40, textAlign: 'center' },
});