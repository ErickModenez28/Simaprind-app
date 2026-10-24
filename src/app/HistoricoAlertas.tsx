import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

type Alerta = {
  id: number;
  equipamentoCodigo: string;
  equipamentoDescricao: string;
  parametro: string;
  valorLido: number;
  descricao: string;
  dataAlerta: string;
  classificacao?: string;
};

const API_URL = "https://qlvmzrjr-7008.brs.devtunnels.ms/api";
const STATUS_OPCOES = ["NORMAL", "ATENÇÃO", "ALERTA", "CRÍTICO"];

const getCoresClassificacao = (classificacao?: string) => {
  switch (classificacao?.toUpperCase()) {
    case "NORMAL": return { bg: "#dcfce7", text: "#15803d" };
    case "ATENÇÃO": return { bg: "#fef08a", text: "#a16207" };
    case "ALERTA": return { bg: "#fed7aa", text: "#c2410c" };
    case "CRÍTICO": return { bg: "#fecaca", text: "#b91c1c" };
    default: return { bg: "#cbd5e1", text: "#334155" };
  }
};

// NOVO: Função para obter a prioridade baseada na classificação ou descrição
function obterPrioridade(classificacao?: string, descricao?: string) {
  const texto = (classificacao || descricao || "").toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  
  if (texto.includes('CRITICO')) return '1'; 
  if (texto.includes('ALERTA')) return '2';  
  if (texto.includes('ATENCAO')) return '3'; 
  
  return '-'; 
}

export default function HistoricoAlertas() {
  const router = useRouter();
  
  const [telaAtual, setTelaAtual] = useState<"filtros" | "resultados">("filtros");

  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [localizacoes, setLocalizacoes] = useState<any[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [showDatePicker, setShowDatePicker] = useState<"inicio" | "fim" | null>(null);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>(STATUS_OPCOES);
  
  const [filtroLoc, setFiltroLoc] = useState<number | null>(null);
  const [filtroFam, setFiltroFam] = useState<number | null>(null);
  const [filtroEq, setFiltroEq] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState<{ visible: boolean, tipo: 'loc' | 'fam' | 'eq' | null }>({ visible: false, tipo: null });
  const [searchText, setSearchText] = useState("");
  const [expandidos, setExpandidos] = useState<string[]>([]);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      const token = await SecureStore.getItemAsync("jwtToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [resAlertas, resLoc, resFam, resEq] = await Promise.all([
        axios.get<Alerta[]>(`${API_URL}/Alertas/historico`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/Localizacoes`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/FamiliaEquipamentos`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/Equipamentos`, { headers }).catch(() => ({ data: [] }))
      ]);

      setAlertas(resAlertas.data);
      setLocalizacoes(resLoc.data);
      setFamilias(resFam.data);
      setEquipamentos(resEq.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentPicker = showDatePicker;
    if (Platform.OS === "android") setShowDatePicker(null);

    if (selectedDate && currentPicker) {
      if (currentPicker === "inicio") {
        selectedDate.setHours(0, 0, 0, 0);
        setDataInicio(selectedDate);
      } else {
        selectedDate.setHours(23, 59, 59, 999);
        setDataFim(selectedDate);
      }
    }
  };

  const toggleStatus = (status: string) => {
    setStatusSelecionados((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const getNomeFiltro = (tipo: 'loc' | 'fam' | 'eq', idOuCodigo: any) => {
    if (!idOuCodigo) return "Todos";
    if (tipo === 'loc') return localizacoes.find(l => l.id === idOuCodigo)?.descricao || idOuCodigo;
    if (tipo === 'fam') return familias.find(f => f.id === idOuCodigo)?.descricao || idOuCodigo;
    if (tipo === 'eq') return equipamentos.find(e => e.codigo === idOuCodigo)?.descricao || idOuCodigo;
    return "Todos";
  };

  const getIdsPermitidosLoc = (idRaiz: number): number[] => {
    const ids = [idRaiz];
    const buscarFilhos = (idPai: number) => {
      const filhos = localizacoes.filter(l => l.idPai === idPai);
      filhos.forEach(f => {
        ids.push(f.id);
        buscarFilhos(f.id);
      });
    };
    buscarFilhos(idRaiz);
    return ids;
  };

  const locsPermitidas = filtroLoc !== null ? getIdsPermitidosLoc(filtroLoc) : [];

  const alertasFiltrados = alertas.filter((a) => {
    const eqAssociado = equipamentos.find(e => e.codigo === a.equipamentoCodigo);

    const matchData = new Date(a.dataAlerta) >= dataInicio && new Date(a.dataAlerta) <= dataFim;
    const classificacaoItem = a.classificacao ? a.classificacao.toUpperCase() : "NORMAL";
    const matchClassificacao = statusSelecionados.includes(classificacaoItem);

    const matchLoc = filtroLoc === null || (eqAssociado && locsPermitidas.includes(eqAssociado.idLocalizacao));
    const matchFam = filtroFam === null || (eqAssociado && eqAssociado.idFamilia === filtroFam);
    const matchEq = filtroEq === null || a.equipamentoCodigo === filtroEq;

    return matchData && matchClassificacao && matchLoc && matchFam && matchEq;
  });

  const alertasAgrupados = Object.values(
    alertasFiltrados.reduce((acc: any, alerta) => {
      const nomeParametro = alerta.parametro || "Geral";
      const key = `${alerta.equipamentoCodigo}_${nomeParametro}`;
      
      if (!acc[key]) {
        acc[key] = {
          chaveUnica: key,
          codigo: alerta.equipamentoCodigo,
          descricao: alerta.equipamentoDescricao,
          parametro: nomeParametro,
          alertas: [],
        };
      }
      acc[key].alertas.push(alerta);
      return acc;
    }, {})
  );

  const toggleExpandir = (chaveUnica: string) => {
    setExpandidos((prev) => prev.includes(chaveUnica) ? prev.filter((c) => c !== chaveUnica) : [...prev, chaveUnica]);
  };

  const renderPesquisaModal = () => {
    let dadosModal: any[] = [];
    if (modalConfig.tipo === 'loc') dadosModal = localizacoes;
    if (modalConfig.tipo === 'fam') dadosModal = familias;
    if (modalConfig.tipo === 'eq') dadosModal = equipamentos;

    const dadosFiltrados = dadosModal.filter(item => {
      const termoBusca = searchText.toLowerCase();
      const desc = item.descricao?.toLowerCase() || '';
      const cod = item.codigo?.toLowerCase() || '';
      return desc.includes(termoBusca) || cod.includes(termoBusca);
    });

    const selecionarItem = (item: any | null) => {
      if (modalConfig.tipo === 'loc') setFiltroLoc(item ? item.id : null);
      if (modalConfig.tipo === 'fam') setFiltroFam(item ? item.id : null);
      if (modalConfig.tipo === 'eq') setFiltroEq(item ? item.codigo : null);
      setModalConfig({ visible: false, tipo: null });
      setSearchText("");
    };

    return (
      <Modal visible={modalConfig.visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione uma opção</Text>
            
            <TextInput
              style={styles.modalSearch}
              placeholder="Digite para pesquisar..."
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />

            <FlatList
              data={dadosFiltrados}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              ListHeaderComponent={
                <Pressable style={styles.modalItem} onPress={() => selecionarItem(null)}>
                  <Text style={[styles.modalItemText, { color: '#ef4444', fontWeight: 'bold' }]}>✖ Limpar Filtro (Todos)</Text>
                </Pressable>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.modalItem} onPress={() => selecionarItem(item)}>
                  <Text style={styles.modalItemText}>{item.codigo} - {item.descricao}</Text>
                </Pressable>
              )}
            />
            
            <Pressable style={styles.modalCloseButton} onPress={() => setModalConfig({ visible: false, tipo: null })}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Carregando infraestrutura...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Consultas Preditivas</Text>
        <Pressable onPress={() => router.back()} style={styles.voltarButton}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
      </View>

      {telaAtual === "filtros" && (
        <View style={styles.filtrosContainer}>
          <Text style={styles.formTitle}>Defina os Filtros</Text>

          <View style={styles.rowDates}>
            <Pressable style={styles.dateButton} onPress={() => setShowDatePicker("inicio")}>
              <Text style={styles.dateLabel}>Data Inicial</Text>
              <Text style={styles.dateValue}>{dataInicio.toLocaleDateString("pt-BR")}</Text>
            </Pressable>
            <Pressable style={styles.dateButton} onPress={() => setShowDatePicker("fim")}>
              <Text style={styles.dateLabel}>Data Final</Text>
              <Text style={styles.dateValue}>{dataFim.toLocaleDateString("pt-BR")}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Localização (Setor/Área)</Text>
          <Pressable style={styles.seletorFalso} onPress={() => setModalConfig({ visible: true, tipo: 'loc' })}>
            <Text style={filtroLoc ? styles.seletorFalsoTextAtivo : styles.seletorFalsoText}>
              {getNomeFiltro('loc', filtroLoc)}
            </Text>
            <Text style={styles.seletorFalsoIcon}>🔍</Text>
          </Pressable>

          <Text style={styles.label}>Família de Equipamento</Text>
          <Pressable style={styles.seletorFalso} onPress={() => setModalConfig({ visible: true, tipo: 'fam' })}>
            <Text style={filtroFam ? styles.seletorFalsoTextAtivo : styles.seletorFalsoText}>
              {getNomeFiltro('fam', filtroFam)}
            </Text>
            <Text style={styles.seletorFalsoIcon}>🔍</Text>
          </Pressable>

          <Text style={styles.label}>Equipamento Específico</Text>
          <Pressable style={styles.seletorFalso} onPress={() => setModalConfig({ visible: true, tipo: 'eq' })}>
            <Text style={filtroEq ? styles.seletorFalsoTextAtivo : styles.seletorFalsoText}>
              {getNomeFiltro('eq', filtroEq)}
            </Text>
            <Text style={styles.seletorFalsoIcon}>🔍</Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: 10 }]}>Status de Alerta:</Text>
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

          <Pressable style={styles.gerarButton} onPress={() => setTelaAtual("resultados")}>
            <Text style={styles.gerarButtonText}>Gerar Resultados ({alertasFiltrados.length})</Text>
          </Pressable>
        </View>
      )}

      {telaAtual === "resultados" && (
        <View style={{ flex: 1 }}>
          <Pressable style={styles.accordionHeader} onPress={() => setTelaAtual("filtros")}>
            <Text style={styles.accordionTitle}>▼ Filtros Ativos ({alertasFiltrados.length} encontrados)</Text>
            <Text style={styles.accordionLink}>Alterar Filtros</Text>
          </Pressable>

          {alertasFiltrados.length === 0 && (
            <View style={styles.graficoPlaceholder}>
              <Text style={styles.graficoText}>📊 Sem dados para gerar gráficos</Text>
            </View>
          )}

          <FlatList
            data={alertasAgrupados}
            keyExtractor={(item: any) => item.chaveUnica}
            renderItem={({ item }: any) => {
              const isExpanded = expandidos.includes(item.chaveUnica);

              let labelsGrafico: string[] = [];
              let valoresGrafico: number[] = [];
              
              if (isExpanded) {
                const dadosOrdenados = [...item.alertas].sort((a, b) => new Date(a.dataAlerta).getTime() - new Date(b.dataAlerta).getTime());
                
                labelsGrafico = dadosOrdenados.map(a => new Date(a.dataAlerta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                valoresGrafico = dadosOrdenados.map(a => Number(a.valorLido) || 0);
                
                if (labelsGrafico.length > 5) {
                  labelsGrafico = labelsGrafico.map((lbl, index) => 
                    (index === 0 || index === labelsGrafico.length - 1 || index === Math.floor(labelsGrafico.length / 2)) ? lbl : ""
                  );
                }
              }

              return (
                <View style={styles.cardGroup}>
                  <Pressable style={styles.cardHeader} onPress={() => toggleExpandir(item.chaveUnica)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.equipment}>{item.codigo}</Text>
                      <Text style={styles.parametroTitle}>Parâmetro: <Text style={{color: '#208AEF'}}>{item.parametro}</Text></Text>
                    </View>
                    <View style={styles.badgeArea}>
                      <Text style={styles.countBadge}>{item.alertas.length} reg.</Text>
                      <Text style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</Text>
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      
                      {valoresGrafico.length > 0 && (
                        <View style={styles.graficoContainer}>
                          <Text style={styles.graficoTitulo}>Evolução ({item.parametro})</Text>
                          <View pointerEvents="none">
                            <LineChart
                              data={{
                                labels: labelsGrafico.length > 0 ? labelsGrafico : ["-"],
                                datasets: [{ data: valoresGrafico.length > 0 ? valoresGrafico : [0] }]
                              }}
                              width={screenWidth - 80}
                              height={180}
                              yAxisLabel=""
                              yAxisSuffix=""
                              chartConfig={{
                                backgroundColor: "#fff",
                                backgroundGradientFrom: "#f8fafc",
                                backgroundGradientTo: "#f8fafc",
                                decimalPlaces: 1,
                                color: (opacity = 1) => `rgba(32, 138, 239, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                                style: { borderRadius: 8 },
                                propsForDots: { r: "4", strokeWidth: "2", stroke: "#208AEF" }
                              }}
                              bezier
                              style={{ marginVertical: 8, borderRadius: 8 }}
                            />
                          </View>
                        </View>
                      )}

                      <Text style={styles.historicoLabel}>Histórico de Leituras:</Text>
                      
                      {item.alertas.sort((a: any, b: any) => new Date(b.dataAlerta).getTime() - new Date(a.dataAlerta).getTime()).map((al: any) => {
                        const prioridade = obterPrioridade(al.classificacao, al.descricao);
                        
                        return (
                          <View key={al.id} style={styles.subCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.subDesc}>
                                Valor: <Text style={{fontWeight: 'bold', color: '#1e293b'}}>{al.valorLido}</Text>
                              </Text>
                              <Text style={styles.subDate}>
                                {new Date(al.dataAlerta).toLocaleString("pt-BR")}
                              </Text>
                            </View>
                            {al.classificacao && (
                              <View style={[styles.classBadge, { backgroundColor: getCoresClassificacao(al.classificacao).bg }]}>
                                <Text style={[styles.classBadgeText, { color: getCoresClassificacao(al.classificacao).text }]}>
                                  {prioridade !== '-' ? `[P${prioridade}] ${al.classificacao}` : al.classificacao}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum registro atende aos filtros atuais.</Text>}
            contentContainerStyle={{ paddingBottom: 30 }}
          />
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === "inicio" ? dataInicio : dataFim}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
      {renderPesquisaModal()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 15, marginTop: 10 },
  title: { color: "#333", fontSize: 20, fontWeight: "bold" },
  voltarButton: { backgroundColor: "#64748b", borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
  voltarText: { color: "#fff", fontWeight: "bold" },

  filtrosContainer: { backgroundColor: "#fff", padding: 18, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  
  label: { fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 6 },
  
  seletorFalso: { flexDirection: 'row', backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#94a3b8", borderRadius: 6, paddingHorizontal: 12, height: 50, alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  seletorFalsoText: { color: '#64748b', fontSize: 14 },
  seletorFalsoTextAtivo: { color: '#1e293b', fontSize: 14, fontWeight: 'bold' },
  seletorFalsoIcon: { fontSize: 16 },

  rowDates: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 15 },
  dateButton: { flex: 1, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#94a3b8", padding: 12, borderRadius: 6, alignItems: "center" },
  dateLabel: { fontSize: 11, color: "#64748b", fontWeight: "bold", marginBottom: 2 },
  dateValue: { fontSize: 14, color: "#1e293b", fontWeight: "bold" },

  checkboxContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", width: "47%" },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#94a3b8", borderRadius: 4, marginRight: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkboxSelected: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "bold", marginTop: -2 },
  checkboxLabel: { fontSize: 13, color: "#1e293b", fontWeight: "bold" },

  gerarButton: { backgroundColor: '#208AEF', padding: 15, borderRadius: 8, alignItems: 'center' },
  gerarButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8, marginBottom: 15 },
  accordionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  accordionLink: { fontSize: 14, fontWeight: 'bold', color: '#208AEF' },
  
  graficoPlaceholder: { backgroundColor: '#fff', height: 150, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  graficoText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },

  cardGroup: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderLeftColor: "#64748b", borderLeftWidth: 6, borderRadius: 10, borderWidth: 1, elevation: 2, marginBottom: 12, overflow: "hidden" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  equipment: { color: "#1e293b", fontSize: 16, fontWeight: "bold" },
  parametroTitle: { color: "#475569", fontSize: 13, marginTop: 2, fontWeight: 'bold' },
  badgeArea: { flexDirection: "row", alignItems: "center" },
  countBadge: { backgroundColor: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: "bold", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, marginRight: 10 },
  expandIcon: { fontSize: 14, color: "#64748b" },
  
  expandedContent: { backgroundColor: "#f8fafc", padding: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  
  graficoContainer: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15, alignItems: 'center' },
  graficoTitulo: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 5, alignSelf: 'flex-start' },
  historicoLabel: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },

  subCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 8 },
  subDesc: { fontSize: 14, color: "#64748b" },
  subDate: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: "bold" },
  classBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  classBadgeText: { fontSize: 11, fontWeight: "bold" },
  empty: { color: "#888", marginTop: 40, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  modalSearch: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#f8fafc' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 16, color: '#334155' },
  modalCloseButton: { marginTop: 15, backgroundColor: '#e2e8f0', padding: 15, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#475569', fontSize: 16, fontWeight: 'bold' }
});