import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Alerta = {
  id: number;
  equipamentoCodigo: string;
  equipamentoDescricao: string;
  descricao: string;
  statusAlerta: string;
  dataAlerta: string;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Alertas';

function obterCorStatus(status: string) {
  switch (status?.toUpperCase()) {
    case 'PENDENTE': return '#eab308'; // Amarelo
    case 'ANALISANDO': return '#3b82f6'; // Azul
    case 'CRÍTICO': return '#991b1b'; // Vermelho
    default: return '#64748b'; // Cinza
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controlar o Acordeão e a Seleção
  const [expandidos, setExpandidos] = useState<string[]>([]);
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<string[]>([]);

  const buscarAlertas = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      if (!token) {
        router.replace('/?erro=sessao' as never);
        return;
      }
      const response = await axios.get<Alerta[]>(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      setAlertas(response.data);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarAlertas();
    const intervalo = setInterval(buscarAlertas, 5000);
    return () => clearInterval(intervalo);
  }, [router]);

  // Lógica para agrupar os alertas por Equipamento
  const alertasAgrupados = Object.values(alertas.reduce((acc: any, alerta) => {
    if (!acc[alerta.equipamentoCodigo]) {
      acc[alerta.equipamentoCodigo] = {
        codigo: alerta.equipamentoCodigo,
        descricao: alerta.equipamentoDescricao,
        alertas: [],
        ultimoAlerta: alerta // Como a API já traz ordenado, o primeiro é o mais recente
      };
    }
    acc[alerta.equipamentoCodigo].alertas.push(alerta);
    return acc;
  }, {}));

  const toggleExpandir = (codigo: string) => {
    setExpandidos(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };

  const toggleSelecao = (codigo: string) => {
    setEquipamentosSelecionados(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };

  const mudarStatusLote = async (novoStatus: string) => {
    if (equipamentosSelecionados.length === 0) return;
    setLoading(true);
    
    // Pega os IDs de TODOS os alertas que pertencem aos equipamentos selecionados
    const idsParaAtualizar = alertas
      .filter(a => equipamentosSelecionados.includes(a.equipamentoCodigo))
      .map(a => a.id);

    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.put(`${API_URL}/status`, 
        { ids: idsParaAtualizar, novoStatus: novoStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEquipamentosSelecionados([]); 
      buscarAlertas(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

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

      <View style={styles.navRow}>
        <Pressable onPress={() => router.push('/menu')} style={styles.navButton}>
          <Text style={styles.navButtonText}>⚙️ Cadastros</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/HistoricoAlertas')} style={[styles.navButton, {backgroundColor: '#64748b'}]}>
          <Text style={styles.navButtonText}>📂 Histórico</Text>
        </Pressable>
      </View>

      {equipamentosSelecionados.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.actionText}>{equipamentosSelecionados.length} equipamento(s)</Text>
          <View style={styles.actionButtons}>
            <Pressable style={[styles.btnAction, {backgroundColor: '#3b82f6'}]} onPress={() => mudarStatusLote('ANALISANDO')}>
              <Text style={styles.btnActionText}>Analisar Todos</Text>
            </Pressable>
            <Pressable style={[styles.btnAction, {backgroundColor: '#16a34a'}]} onPress={() => mudarStatusLote('CONCLUIDO')}>
              <Text style={styles.btnActionText}>Concluir Todos</Text>
            </Pressable>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#208AEF" style={styles.loading} />
      ) : (
        <FlatList
          data={alertasAgrupados}
          keyExtractor={(item: any) => item.codigo}
          renderItem={({ item }: any) => {
            const isExpanded = expandidos.includes(item.codigo);
            const isSelected = equipamentosSelecionados.includes(item.codigo);
            const corStatus = obterCorStatus(item.ultimoAlerta.statusAlerta);

            return (
              <View style={[styles.cardGroup, { borderLeftColor: corStatus, backgroundColor: isSelected ? '#f0f9ff' : '#fff' }]}>
                {/* Cabeçalho do Equipamento */}
                <View style={styles.cardHeader}>
                  <Pressable style={styles.selectArea} onPress={() => toggleSelecao(item.codigo)}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <View>
                      <Text style={styles.equipment}>{item.codigo}</Text>
                      <Text style={styles.equipmentDesc}>{item.descricao}</Text>
                    </View>
                  </Pressable>
                  
                  <Pressable style={styles.expandArea} onPress={() => toggleExpandir(item.codigo)}>
                    <View style={[styles.statusBadge, { backgroundColor: corStatus }]}>
                      <Text style={styles.statusBadgeText}>{item.ultimoAlerta.statusAlerta}</Text>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </Pressable>
                </View>

                {/* Lista de alertas detalhados (aparece se expandido) */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.expandedTitle}>Histórico de Leituras Pendentes ({item.alertas.length}):</Text>
                    {item.alertas.map((al: any) => (
                      <View key={al.id} style={styles.subCard}>
                        <Text style={styles.subDesc}>{al.descricao}</Text>
                        <Text style={styles.subDate}>{new Date(al.dataAlerta).toLocaleString('pt-BR')}</Text>
                        <Text style={[styles.subStatus, { color: obterCorStatus(al.statusAlerta) }]}>{al.statusAlerta}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum equipamento com alertas.</Text>}
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
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  navButton: { flex: 0.48, backgroundColor: '#208AEF', borderRadius: 8, padding: 14 },
  navButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
actionBar: { flexDirection: 'column', alignItems: 'center', backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8, marginBottom: 10 },
  actionText: { fontWeight: 'bold', color: '#333', marginBottom: 12, fontSize: 15 },
  actionButtons: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 10 },
  btnAction: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnActionText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  loading: { marginTop: 50 },
  cardGroup: { borderColor: '#e2e8f0', borderLeftWidth: 6, borderRadius: 10, borderWidth: 1, elevation: 2, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  selectArea: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 4, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  checkMark: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginTop: -2 },
  equipment: { color: '#1e293b', fontSize: 16, fontWeight: 'bold' },
  equipmentDesc: { color: '#475569', fontSize: 13 },
  expandArea: { flexDirection: 'row', alignItems: 'center', paddingLeft: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  expandIcon: { fontSize: 16, color: '#64748b' },
  expandedContent: { backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderColor: '#e2e8f0' },
  expandedTitle: { fontWeight: 'bold', color: '#475569', marginBottom: 10 },
  subCard: { backgroundColor: '#fff', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  subDesc: { fontSize: 14, color: '#333' },
  subDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
  subStatus: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  empty: { color: '#888', marginTop: 40, textAlign: 'center' },
});