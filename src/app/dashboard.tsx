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
  equipamentoCodigo: string;
  equipamentoDescricao: string;
  descricao: string;
  statusAlerta: string;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Alertas';

function obterCorStatus(status: string) {
  switch (status.toUpperCase()) {
    case 'CRÍTICO':
      return '#991b1b';
    case 'ALERTA':
      return '#f97316';
    case 'ATENÇÃO':
      return '#d4a017';
    default:
      return '#64748b';
  }
}

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

      <Pressable onPress={() => router.push('/menu')} style={styles.registersButton}>
        <Text style={styles.registersButtonText}>⚙️ Cadastros e Regras Preditivas</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator size="large" color="#208AEF" style={styles.loading} />
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderLeftColor: obterCorStatus(item.statusAlerta) }]}>
              <Text style={styles.equipment}>
                {item.equipamentoCodigo} - {item.equipamentoDescricao}
              </Text>
              <Text style={styles.description}>{item.descricao}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: obterCorStatus(item.statusAlerta) },
                  ]}
                />
                <Text style={[styles.status, { color: obterCorStatus(item.statusAlerta) }]}>
                  {item.statusAlerta}
                </Text>
              </View>
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
  registersButton: { backgroundColor: '#208AEF', borderRadius: 8, marginBottom: 16, padding: 14 },
  registersButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  loading: { marginTop: 50 },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
    borderLeftWidth: 6,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  equipment: { color: '#1e293b', fontSize: 16, fontWeight: 'bold' },
  description: { color: '#475569', fontSize: 14, marginVertical: 8 },
  statusRow: { alignItems: 'center', flexDirection: 'row' },
  statusIndicator: { borderRadius: 6, height: 10, marginRight: 8, width: 10 },
  status: { fontSize: 12, fontStyle: 'italic', fontWeight: 'bold' },
  empty: { color: '#888', marginTop: 40, textAlign: 'center' },
});