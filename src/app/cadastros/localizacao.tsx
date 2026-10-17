import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Localizacao = {
  id: number;
  codigo: string;
  descricao: string;
  idPai?: number | null;
  deposito: number | boolean;
  nivel?: number;
  ativo: number | boolean;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Localizacoes';

export default function CadastroLocalizacao() {
  const router = useRouter();
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados do Formulário (Upsert)
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [idPai, setIdPai] = useState<number | ''>('');
  const [isDeposito, setIsDeposito] = useState(false);
  const [ativo, setAtivo] = useState(true);

  // Controle de expansão dos nós na árvore (armazena os IDs abertos)
  const [expandidos, setExpandidos] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    carregarLocalizacoes();
  }, []);

  const carregarLocalizacoes = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const response = await axios.get<Localizacao[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocalizacoes(response.data);
    } catch (error) {
      console.error("Erro ao carregar localizações:", error);
      Alert.alert('Erro', 'Não foi possível carregar as localizações.');
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (loc: Localizacao) => {
    setCodigo(loc.codigo);
    setDescricao(loc.descricao);
    setIdPai(loc.idPai ?? '');
    setIsDeposito(loc.deposito === 1 || loc.deposito === true);
    setAtivo(loc.ativo === 1 || loc.ativo === true);
    setIdEmEdicao(loc.id);
  };

  const cancelarEdicao = () => {
    setCodigo('');
    setDescricao('');
    setIdPai('');
    setIsDeposito(false);
    setAtivo(true);
    setIdEmEdicao(null);
  };

  const salvarLocalizacao = async () => {
    if (!codigo.trim() || !descricao.trim()) {
      Alert.alert('Atenção', 'Código e Descrição são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const codigoFormatado = codigo.toUpperCase().trim();

      const locExistente = localizacoes.find(l => l.codigo === codigoFormatado);
      const idParaSalvar = idEmEdicao || (locExistente ? locExistente.id : null);

      const nivelCalculado = idPai === '' ? 1 : 2; // Pode ajustar conforme a profundidade real

      const payload = {
        id: idParaSalvar || 0,
        codigo: codigoFormatado,
        descricao: descricao.trim(),
        idPai: idPai === '' ? null : Number(idPai),
        deposito: isDeposito ? 1 : 0,
        nivel: nivelCalculado,
        ativo: ativo ? 1 : 0
      };

      const headers = { Authorization: `Bearer ${token}` };

      if (idParaSalvar) {
        await axios.put(`${API_URL}/${idParaSalvar}`, payload, { headers });
        Alert.alert('Sucesso', 'Localização atualizada com sucesso!');
      } else {
        await axios.post(API_URL, payload, { headers });
        Alert.alert('Sucesso', 'Localização cadastrada com sucesso!');
      }

      cancelarEdicao();
      carregarLocalizacoes();
    } catch (error: any) {
      const detalhesErro = error.response?.data?.errors || error.response?.data || error.message;
      Alert.alert('Erro na API', JSON.stringify(detalhesErro));
    } finally {
      setSalvando(false);
    }
  };

  const deletarLocalizacao = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (idEmEdicao === id) cancelarEdicao();
      carregarLocalizacoes();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover. Verifique se não possui sub-locais ou equipamentos vinculados.');
    }
  };

  const confirmarDelecao = (id: number, codigoDesc: string) => {
    Alert.alert('Remover', `Deseja remover a localização ${codigoDesc}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deletarLocalizacao(id) }
    ]);
  };

  // Alterna o estado de expansão de um nó na árvore
  const toggleExpand = (id: number) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Constrói a lista achatada estruturada em árvore com indentação
  const renderizarArvore = () => {
    const raiz = localizacoes.filter(l => !l.idPai); // Nós principais (sem pai)
    const resultado: { item: Localizacao; nivelIndentacao: number; temFilhos: boolean }[] = [];

    const percorrer = (idPaiAtual: number | null, indentacao: number) => {
      const filhos = localizacoes.filter(l => l.idPai === idPaiAtual);
      filhos.forEach(filho => {
        const temFilhos = localizacoes.some(l => l.idPai === filho.id);
        resultado.push({ item: filho, nivelIndentacao: indentacao, temFilhos });

        // Se estiver expandido, percorre os filhos recursivamente
        if (expandidos[filho.id]) {
          percorrer(filho.id, indentacao + 1);
        }
      });
    };

    raiz.forEach(pai => {
      const temFilhos = localizacoes.some(l => l.idPai === pai.id);
      resultado.push({ item: pai, nivelIndentacao: 0, temFilhos });
      if (expandidos[pai.id]) {
        percorrer(pai.id, 1);
      }
    });

    return resultado;
  };

  const arvoreDados = renderizarArvore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Localizações</Text>
        <Pressable onPress={() => router.back()} style={styles.voltarButton}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
      </View>

      {/* FORMULÁRIO COMPACTO (Upsert) */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {idEmEdicao ? `Editando: ${codigo}` : 'Nova Localização'}
        </Text>
        
        <View style={styles.row}>
          <View style={styles.colHalf}>
            <Text style={styles.label}>Código</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: SET-MOAGEM"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.label}>Local Pai (Hierarquia)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={idPai}
                onValueChange={(itemValue) => setIdPai(itemValue)}
                style={styles.pickerCompact}
              >
                <Picker.Item label="Nenhum (Raiz)" value="" />
                {localizacoes
                  .filter(l => l.id !== idEmEdicao) // Evita que um local seja pai de si mesmo
                  .map((loc) => (
                    <Picker.Item key={loc.id} label={`${loc.codigo} - ${loc.descricao}`} value={loc.id} />
                  ))}
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.inputCompact}
          placeholder="Ex: Setor de Moagem Principal"
          value={descricao}
          onChangeText={setDescricao}
        />

        <View style={styles.rowSwitches}>
          <View style={styles.switchWrapper}>
            <Text style={styles.labelSwitch}>Depósito?</Text>
            <Switch value={isDeposito} onValueChange={setIsDeposito} trackColor={{ false: "#94a3b8", true: "#208AEF" }} />
          </View>
          <View style={styles.switchWrapper}>
            <Text style={styles.labelSwitch}>Ativo?</Text>
            <Switch value={ativo} onValueChange={setAtivo} trackColor={{ false: "#94a3b8", true: "#16a34a" }} />
          </View>
        </View>

        <View style={styles.botoesRow}>
          <Pressable 
            style={[styles.saveButton, salvando && styles.disabledButton]} 
            onPress={salvarLocalizacao} 
            disabled={salvando}
          >
            <Text style={styles.saveButtonText}>
              {salvando ? 'Aguarde...' : (idEmEdicao ? 'Atualizar' : 'Salvar')}
            </Text>
          </Pressable>

          {idEmEdicao !== null && (
            <Pressable style={styles.cancelButton} onPress={cancelarEdicao}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ÁRVORE DE LOCALIZAÇÕES EMBAIXO */}
      {loading ? (
        <ActivityIndicator size="large" color="#208AEF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={arvoreDados}
          keyExtractor={(node) => node.item.id.toString()}
          renderItem={({ item: node }) => {
            const { item, nivelIndentacao, temFilhos } = node;
            const estaExpandido = expandidos[item.id];

            return (
              <View style={[styles.cardTree, { marginLeft: nivelIndentacao * 20 }]}>
                {/* Botão para Expandir/Recolher se tiver filhos */}
                {temFilhos ? (
                  <Pressable onPress={() => toggleExpand(item.id)} style={styles.expandButton}>
                    <Text style={styles.expandIcon}>{estaExpandido ? '▼' : '▶'}</Text>
                  </Pressable>
                ) : (
                  <View style={{ width: 20 }} />
                )}

                {/* Clicar no texto prepara a edição */}
                <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.cardCodigo}>{item.codigo}</Text>
                    {Boolean(item.deposito) && <Text style={styles.badgeDep}>DEP</Text>}
                  </View>
                  <Text style={styles.cardDescricao}>{item.descricao}</Text>
                </Pressable>

                <Pressable onPress={() => confirmarDelecao(item.id, item.codigo)} style={styles.iconContainer}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma localização cadastrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 5 },
  title: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  voltarButton: { backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  voltarText: { color: '#fff', fontWeight: 'bold' },
  
  formContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  
  inputCompact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, paddingHorizontal: 12, marginBottom: 10, fontSize: 14, color: '#1e293b', height: 50, justifyContent: 'center' },
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, marginBottom: 10, justifyContent: 'center' },
  pickerCompact: { height: 50, color: '#1e293b' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '48%' },

  rowSwitches: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 5 },
  switchWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelSwitch: { fontSize: 13, fontWeight: 'bold', color: '#475569' },

  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#208AEF', padding: 12, borderRadius: 6, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // ESTILOS DA ÁRVORE (TREE VIEW)
  cardTree: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  expandButton: { padding: 5, marginRight: 5 },
  expandIcon: { fontSize: 12, color: '#208AEF', fontWeight: 'bold' },
  cardCodigo: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  cardDescricao: { fontSize: 12, color: '#475569', marginTop: 2 },
  badgeDep: { backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  iconContainer: { padding: 5 },
  deleteIcon: { fontSize: 18, marginLeft: 10, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20, fontSize: 14 }
});