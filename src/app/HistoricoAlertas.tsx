import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

type Alerta = {
  id: number;
  equipamentoCodigo: string;
  equipamentoDescricao: string;
  descricao: string;
  dataAlerta: string;
  classificacao?: string; // Trazido do backend (NORMAL, ATENÇÃO, ALERTA, CRÍTICO)
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Alertas/historico';
const STATUS_OPCOES = ['NORMAL', 'ATENÇÃO', 'ALERTA', 'CRÍTICO'];

export default function HistoricoAlertas() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Estados da Data (Padrão: Hoje - 7 dias até Hoje)
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0); // Trava em 00:00:00
    return d;
  });

  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999); // Trava em 23:59:59
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState<'inicio' | 'fim' | null>(null);

  // 2. Estados dos Status e Busca (Padrão: Todos marcados)
  const [busca, setBusca] = useState('');
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>(STATUS_OPCOES);
  const [expandidos, setExpandidos] = useState<string[]>([]);

  useEffect(() => {
    const buscarHistorico = async () => {
      try {
        const token = await SecureStore.getItemAsync('jwtToken');
        const response = await axios.get<Alerta[]>(API_URL, { headers: { Authorization: `Bearer ${token}` } });
        setAlertas(response.data);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);
      } finally {
        setLoading(false);
      }
    };
    buscarHistorico();
  }, []);

  // Handler para quando a data é selecionada no calendário
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showDatePicker;
    // No Android, precisamos fechar o picker logo após a seleção
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }
    
    if (selectedDate && currentPicker) {
      if (currentPicker === 'inicio') {
        selectedDate.setHours(0, 0, 0, 0);
        setDataInicio(selectedDate);
      } else {
        selectedDate.setHours(23, 59, 59, 999);
        setDataFim(selectedDate);
      }
    }
  };

  const toggleStatus = (status: string) => {
    setStatusSelecionados(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  // ==========================================
  // MOTOR DE FILTRAGEM (Busca + Data + Status)
  // ==========================================
  const alertasFiltrados = alertas.filter(a => {
    // 1. Filtro de Texto (Código ou Descrição)
    const matchBusca = a.equipamentoCodigo.toLowerCase().includes(busca.toLowerCase()) || 
                       a.equipamentoDescricao.toLowerCase().includes(busca.toLowerCase());

    // 2. Filtro de Data
    const dataDoAlerta = new Date(a.dataAlerta);
    const matchData = dataDoAlerta >= dataInicio && dataDoAlerta <= dataFim;

    // 3. Filtro de Classificação (Se for null, assumimos NORMAL)
    const classificacaoItem = a.classificacao ? a.classificacao.toUpperCase() : 'NORMAL';
    const matchClassificacao = statusSelecionados.includes(classificacaoItem);

    return matchBusca && matchData && matchClassificacao;
  });

  // Agrupamento dos resultados filtrados
  const alertasAgrupados = Object.values(alertasFiltrados.reduce((acc: any, alerta) => {
    if (!acc[alerta.equipamentoCodigo]) {
      acc[alerta.equipamentoCodigo] = {
        codigo: alerta.equipamentoCodigo,
        descricao: alerta.equipamentoDescricao,
        alertas: [],
      };
    }
    acc[alerta.equipamentoCodigo].alertas.push(alerta);
    return acc;
  }, {}));

  const toggleExpandir = (codigo: string) => {
    setExpandidos(prev => prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Leituras</Text>
        <Pressable onPress={() => router.back()} style={styles.voltarButton}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
      </View>

      {/* ÁREA DE FILTROS */}
      <View style={styles.filtrosContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar equipamento..."
          value={busca}
          onChangeText={setBusca}
        />
        
        {/* Filtro de Datas */}
        <View style={styles.rowDates}>
          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker('inicio')}>
            <Text style={styles.dateLabel}>Data Inicial</Text>
            <Text style={styles.dateValue}>{dataInicio.toLocaleDateString('pt-BR')}</Text>
          </Pressable>
          <Pressable style={styles.dateButton} onPress={() => setShowDatePicker('fim')}>
            <Text style={styles.dateLabel}>Data Final</Text>
            <Text style={styles.dateValue}>{dataFim.toLocaleDateString('pt-BR')}</Text>
          </Pressable>
        </View>

        {/* Filtro de Status (Checkboxes customizados) */}
        <Text style={styles.statusTitle}>Filtrar por Status:</Text>
        <View style={styles.checkboxContainer}>
          {STATUS_OPCOES.map((status) => {
            const isSelected = statusSelecionados.includes(status);
            return (
              <Pressable key={status} style={styles.checkboxWrapper} onPress={() => toggleStatus(status)}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{status}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* COMPONENTE DO CALENDÁRIO (Invisível até o usuário clicar) */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'inicio' ? dataInicio : dataFim}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* LISTA DE RESULTADOS */}
      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loading} />
      ) : (
        <FlatList
          data={alertasAgrupados}
          keyExtractor={(item: any) => item.codigo}
          renderItem={({ item }: any) => {
            const isExpanded = expandidos.includes(item.codigo);
            return (
              <View style={styles.cardGroup}>
                <Pressable style={styles.cardHeader} onPress={() => toggleExpandir(item.codigo)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.equipment}>{item.codigo}</Text>
                    <Text style={styles.equipmentDesc}>{item.descricao}</Text>
                  </View>
                  <View style={styles.badgeArea}>
                    <Text style={styles.countBadge}>{item.alertas.length} reg.</Text>
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {item.alertas.map((al: any) => (
                      <View key={al.id} style={styles.subCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subDesc}>{al.descricao}</Text>
                          <Text style={styles.subDate}>{new Date(al.dataAlerta).toLocaleString('pt-BR')}</Text>
                        </View>
                        {al.classificacao && (
                          <View style={styles.classBadge}>
                            <Text style={styles.classBadgeText}>{al.classificacao}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum registro atende aos filtros atuais.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  title: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  voltarButton: { backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
  voltarText: { color: '#fff', fontWeight: 'bold' },
  
  // Estilos dos Filtros
  filtrosContainer: { backgroundColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 15 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 14 },
  
  // Datas
  rowDates: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  dateButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 6, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: '#64748b', fontWeight: 'bold', marginBottom: 2 },
  dateValue: { fontSize: 14, color: '#333', fontWeight: 'bold' },

  // Checkboxes
  statusTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 5 },
  checkboxContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  checkboxWrapper: { flexDirection: 'row', alignItems: 'center', width: '47%' },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 4, marginRight: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkboxSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: -2 },
  checkboxLabel: { fontSize: 13, color: '#333', fontWeight: 'bold' },
  
  loading: { marginTop: 50 },
  cardGroup: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderLeftColor: '#64748b', borderLeftWidth: 6, borderRadius: 10, borderWidth: 1, elevation: 2, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  equipment: { color: '#1e293b', fontSize: 16, fontWeight: 'bold' },
  equipmentDesc: { color: '#475569', fontSize: 13 },
  badgeArea: { flexDirection: 'row', alignItems: 'center' },
  countBadge: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, marginRight: 10 },
  expandIcon: { fontSize: 14, color: '#64748b' },
  expandedContent: { backgroundColor: '#f8fafc', padding: 16, borderTopWidth: 1, borderColor: '#e2e8f0' },
  subCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  subDesc: { fontSize: 14, color: '#333' },
  subDate: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 'bold' },
  classBadge: { backgroundColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  classBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  empty: { color: '#888', marginTop: 40, textAlign: 'center' },
});