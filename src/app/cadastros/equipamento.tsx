import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Equipamento = {
  id?: number;
  codigo: string;
  descricao: string;
  idFamilia: number;
  idLocalizacao: number;
  ativo: number | boolean;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api';

export default function CadastroEquipamento() {
  const router = useRouter();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [familias, setFamilias] = useState<any[]>([]);
  const [localizacoes, setLocalizacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estado para controlar a visibilidade do formulário (Acordeão)
  const [formVisible, setFormVisible] = useState(false);

  // Estados do formulário
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [idFamilia, setIdFamilia] = useState<number | ''>('');
  const [idLocalizacao, setIdLocalizacao] = useState<number | ''>('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [resEq, resFam, resLoc] = await Promise.all([
        axios.get(`${API_URL}/Equipamentos`, { headers }),
        axios.get(`${API_URL}/FamiliaEquipamentos`, { headers }),
        axios.get(`${API_URL}/Localizacoes`, { headers })
      ]);

      setEquipamentos(resEq.data);
      setFamilias(resFam.data);
      setLocalizacoes(resLoc.data);

      if (resFam.data.length > 0) setIdFamilia(resFam.data[0].id);
      
      const locaisParaEquipamento = resLoc.data.filter((loc: any) => 
        loc.atrelaEquipamento === 1 || loc.atrelaEquipamento === true
      );
      if (locaisParaEquipamento.length > 0) setIdLocalizacao(locaisParaEquipamento[0].id);

    } catch (error: any) {
      console.error("ERRO CARREGAMENTO: ", error.message);
      Alert.alert('Erro', 'Não foi possível carregar os dados base.');
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (eq: Equipamento) => {
    setCodigo(eq.codigo);
    setDescricao(eq.descricao);
    setIdFamilia(eq.idFamilia);
    setIdLocalizacao(eq.idLocalizacao);
    setAtivo(eq.ativo === 1 || eq.ativo === true);
    setIdEmEdicao(eq.id!);
    setFormVisible(true); // Expande o formulário automaticamente
  };

  const cancelarEdicao = () => {
    setCodigo('');
    setDescricao('');
    if (familias.length > 0) setIdFamilia(familias[0].id);
    
    const locaisParaEquipamento = localizacoes.filter((loc: any) => 
      loc.atrelaEquipamento === 1 || loc.atrelaEquipamento === true
    );
    if (locaisParaEquipamento.length > 0) setIdLocalizacao(locaisParaEquipamento[0].id);
    else setIdLocalizacao('');

    setAtivo(true);
    setIdEmEdicao(null);
    setFormVisible(false); // Recolhe o formulário
  };

  const salvarEquipamento = async () => {
    if (!codigo || !descricao || idFamilia === '' || idLocalizacao === '') {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const codigoFormatado = codigo.toUpperCase().trim();
      const headers = { Authorization: `Bearer ${token}` };

      const equipamentoExistente = equipamentos.find(e => e.codigo === codigoFormatado);
      const idParaSalvar = idEmEdicao || (equipamentoExistente ? equipamentoExistente.id : null);

      const payload = {
        id: idParaSalvar,
        codigo: codigoFormatado,
        descricao: descricao.trim(),
        idFamilia: Number(idFamilia),
        idLocalizacao: Number(idLocalizacao),
        ativo: ativo ? 1 : 0
      };

      if (idParaSalvar) {
        await axios.put(`${API_URL}/Equipamentos/${idParaSalvar}`, payload, { headers });
        Alert.alert('Sucesso', 'Equipamento atualizado!');
      } else {
        await axios.post(`${API_URL}/Equipamentos`, payload, { headers });
        Alert.alert('Sucesso', 'Equipamento cadastrado!');
      }

      cancelarEdicao();
      
      const resEq = await axios.get(`${API_URL}/Equipamentos`, { headers });
      setEquipamentos(resEq.data);
    } catch (error: any) {
      const detalhesErro = error.response?.data?.errors || error.response?.data || error.message;
      Alert.alert('Erro na API', JSON.stringify(detalhesErro));
    } finally {
      setSalvando(false);
    }
  };

  const deletarEquipamento = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.delete(`${API_URL}/Equipamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (idEmEdicao === id) cancelarEdicao();
      
      const resEq = await axios.get(`${API_URL}/Equipamentos`, { headers: { Authorization: `Bearer ${token}` } });
      setEquipamentos(resEq.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover este equipamento.');
    }
  };

  const confirmarDelecao = (id: number, codigoDesc: string) => {
    Alert.alert('Remover', `Deseja remover o equipamento ${codigoDesc}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deletarEquipamento(id) }
    ]);
  };

  const getDescricaoPorId = (lista: any[], id: number) => {
    const item = lista.find(i => i.id === id);
    return item ? item.codigo : `ID: ${id}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipamentos</Text>
        <Pressable onPress={() => router.back()} style={styles.voltarButton}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.formContainer}>
        {/* CABEÇALHO DO ACORDEÃO */}
        <Pressable 
          style={styles.accordionHeader} 
          onPress={() => setFormVisible(!formVisible)}
        >
          <Text style={styles.formTitle}>
            {idEmEdicao ? `Editando: ${codigo}` : '➕ Novo Equipamento'}
          </Text>
          <Text style={styles.accordionIcon}>
            {formVisible ? '▲ Ocultar' : '▼ Expandir'}
          </Text>
        </Pressable>
        
        {/* CONTEÚDO DO FORMULÁRIO */}
        {formVisible && (
          <View style={styles.formBody}>
            <View style={styles.row}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Código</Text>
                <TextInput
                  style={styles.inputCompact}
                  placeholder="Ex: MOT-001"
                  value={codigo}
                  onChangeText={setCodigo}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Família</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={idFamilia}
                    onValueChange={(itemValue) => setIdFamilia(itemValue)}
                    style={styles.pickerCompact}
                    itemStyle={styles.pickerItemCompact}
                  >
                    {familias.map((fam) => (
                      <Picker.Item key={fam.id} label={`${fam.codigo || fam.code}`} value={fam.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: Motor Elétrico"
              value={descricao}
              onChangeText={setDescricao}
            />

            <View style={styles.row}>
              <View style={[styles.colHalf, { width: '65%' }]}>
                <Text style={styles.label}>Localização (Atreláveis)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={idLocalizacao}
                    onValueChange={(itemValue) => setIdLocalizacao(itemValue)}
                    style={styles.pickerCompact}
                    itemStyle={styles.pickerItemCompact}
                  >
                    {localizacoes
                      .filter(loc => loc.atrelaEquipamento === 1 || loc.atrelaEquipamento === true)
                      .map((loc) => (
                        <Picker.Item key={loc.id} label={`${loc.codigo}`} value={loc.id} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={[styles.colHalf, { width: '30%', alignItems: 'center' }]}>
                <Text style={styles.label}>Ativo</Text>
                <Switch 
                  value={ativo} 
                  onValueChange={setAtivo} 
                  trackColor={{ false: "#94a3b8", true: "#16a34a" }} 
                  style={{ marginTop: 8 }}
                />
              </View>
            </View>

            <View style={styles.botoesRow}>
              <Pressable 
                style={[styles.saveButton, salvando && styles.disabledButton]} 
                onPress={salvarEquipamento} 
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
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={equipamentos}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.cardCodigo}>{item.codigo}</Text>
                  <View style={[styles.statusIndicator, { backgroundColor: item.ativo ? '#16a34a' : '#ef4444' }]} />
                </View>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
                <View style={styles.badges}>
                  <Text style={styles.badge}>{getDescricaoPorId(familias, item.idFamilia)}</Text>
                  <Text style={styles.badge}>{getDescricaoPorId(localizacoes, item.idLocalizacao)}</Text>
                </View>
              </Pressable>
              
              <Pressable onPress={() => confirmarDelecao(item.id!, item.codigo)} style={styles.iconContainer}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum equipamento cadastrado.</Text>}
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
  
  // Estilos do Acordeão
  formContainer: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f8fafc' },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  accordionIcon: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  formBody: { padding: 15, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  
  // Aumento da altura para 55 e fonte para 13 (idêntico a Localizações)
  inputCompact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, paddingHorizontal: 12, marginBottom: 10, fontSize: 13, color: '#1e293b', height: 55, justifyContent: 'center' },
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, marginBottom: 10, justifyContent: 'center', height: 55 },
  pickerCompact: { height: 55, color: '#1e293b', fontSize: 13 }, 
  pickerItemCompact: { fontSize: 13 },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '48%' },

  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 6, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  cardCodigo: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  cardDescricao: { fontSize: 13, color: '#475569', marginTop: 2, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, color: '#475569', fontWeight: 'bold' },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  iconContainer: { padding: 5 },
  deleteIcon: { fontSize: 20, marginLeft: 10, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20, fontSize: 14 }
});