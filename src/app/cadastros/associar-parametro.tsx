import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type RegraPreditiva = {
  id?: number;
  equipamento_Code: string;
  parametro_Code: string;
  possui_Valor: number | boolean;
  valorEsperado: number;
  valorNominal: number;
  valorMinimo: number;
  valorMaximo: number;
  margemAtencao?: number; // NOVO: Propriedade para a porcentagem
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api';

export default function AssociarParametro() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  // Listas
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [parametros, setParametros] = useState<any[]>([]);
  const [regras, setRegras] = useState<RegraPreditiva[]>([]);

  // Acordeão
  const [formVisible, setFormVisible] = useState(false);

  // Estados do formulário
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);
  const [equipamentoCode, setEquipamentoCode] = useState('');
  const [parametroCode, setParametroCode] = useState('');
  const [valorEsperado, setValorEsperado] = useState('');
  const [valorNominal, setValorNominal] = useState('');
  const [valorMinimo, setValorMinimo] = useState('');
  const [valorMaximo, setValorMaximo] = useState('');
  const [margemAtencao, setMargemAtencao] = useState('80'); // NOVO: Inicia em 80%

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Busca tudo simultaneamente
      const [resEquipamentos, resParametros, resRegras] = await Promise.all([
        axios.get(`${API_URL}/Equipamentos`, { headers }),
        axios.get(`${API_URL}/Parametros`, { headers }),
        axios.get(`${API_URL}/ParametrosEquipamentos`, { headers }).catch(() => ({ data: [] }))
      ]);

      setEquipamentos(resEquipamentos.data);
      setParametros(resParametros.data);
      setRegras(resRegras.data);

    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar as listas base.');
    } finally {
      setLoadingDados(false);
    }
  };

  const prepararEdicao = (regra: RegraPreditiva) => {
    setEquipamentoCode(regra.equipamento_Code);
    setParametroCode(regra.parametro_Code);
    setValorEsperado(regra.valorEsperado.toString());
    setValorNominal(regra.valorNominal.toString());
    setValorMinimo(regra.valorMinimo.toString());
    setValorMaximo(regra.valorMaximo.toString());
    // NOVO: Carrega a margem ou joga 80 se estiver vazio
    setMargemAtencao(regra.margemAtencao ? regra.margemAtencao.toString() : '80'); 
    setIdEmEdicao(regra.id!);
    setFormVisible(true); // Expande o formulário
  };

  const cancelarEdicao = () => {
    setEquipamentoCode('');
    setParametroCode('');
    setValorEsperado('');
    setValorNominal('');
    setValorMinimo('');
    setValorMaximo('');
    setMargemAtencao('80'); // NOVO: Volta para o padrão
    setIdEmEdicao(null);
    setFormVisible(false); // Recolhe o formulário
  };

  const salvarAssociacao = async () => {
    if (!equipamentoCode || !parametroCode || !valorEsperado || !valorNominal || !valorMinimo || !valorMaximo || !margemAtencao) {
      Alert.alert('Atenção', 'Preencha todos os campos para a análise preditiva.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        id: idEmEdicao || 0,
        equipamento_Code: equipamentoCode,
        parametro_Code: parametroCode,
        possui_Valor: 1,
        valorEsperado: parseFloat(valorEsperado.replace(',', '.')),
        valorNominal: parseFloat(valorNominal.replace(',', '.')),
        valorMinimo: parseFloat(valorMinimo.replace(',', '.')),
        valorMaximo: parseFloat(valorMaximo.replace(',', '.')),
        margemAtencao: parseFloat(margemAtencao.replace(',', '.')) // NOVO: Envia para a API
      };

      if (idEmEdicao) {
        await axios.put(`${API_URL}/ParametrosEquipamentos/${idEmEdicao}`, payload, { headers });
        Alert.alert('Sucesso', 'Regra preditiva atualizada com sucesso!');
      } else {
        await axios.post(`${API_URL}/ParametrosEquipamentos`, payload, { headers });
        Alert.alert('Sucesso', 'Regra preditiva vinculada com sucesso!');
      }

      cancelarEdicao();
      
      // Recarrega a lista
      const resRegras = await axios.get(`${API_URL}/ParametrosEquipamentos`, { headers });
      setRegras(resRegras.data);

    } catch (error: any) {
      const detalhesErro = error.response?.data?.errors || error.response?.data || error.message;
      Alert.alert('Erro', JSON.stringify(detalhesErro));
    } finally {
      setLoading(false);
    }
  };

  const deletarRegra = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.delete(`${API_URL}/ParametrosEquipamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (idEmEdicao === id) cancelarEdicao();
      
      const resRegras = await axios.get(`${API_URL}/ParametrosEquipamentos`, { headers: { Authorization: `Bearer ${token}` } });
      setRegras(resRegras.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover esta regra.');
    }
  };

  const confirmarDelecao = (id: number, equip: string, param: string) => {
    Alert.alert('Remover', `Deseja remover a regra do parâmetro ${param} para o equipamento ${equip}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deletarRegra(id) }
    ]);
  };

  if (loadingDados) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Carregando infraestrutura...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Regras Preditivas</Text>
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
            {idEmEdicao ? `Editando Regra` : '➕ Nova Regra Preditiva'}
          </Text>
          <Text style={styles.accordionIcon}>
            {formVisible ? '▲ Ocultar' : '▼ Expandir'}
          </Text>
        </Pressable>

        {/* CONTEÚDO DO FORMULÁRIO */}
        {formVisible && (
          <View style={styles.formBody}>
            <Text style={styles.label}>Equipamento *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={equipamentoCode} 
                onValueChange={setEquipamentoCode} 
                style={styles.pickerCompact}
                itemStyle={styles.pickerItemCompact}
              >
                <Picker.Item label="Selecione o equipamento..." value="" />
                {equipamentos.map((eq) => (
                  <Picker.Item key={eq.id} label={`${eq.codigo || eq.code} - ${eq.descricao}`} value={eq.codigo || eq.code} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Parâmetro de Leitura *</Text>
            <View style={styles.pickerContainer}>
              <Picker 
                selectedValue={parametroCode} 
                onValueChange={setParametroCode} 
                style={styles.pickerCompact}
                itemStyle={styles.pickerItemCompact}
              >
                <Picker.Item label="Ex: Temperatura, Vibração..." value="" />
                {parametros.map((param) => (
                  <Picker.Item key={param.id} label={`${param.codigo || param.code} - ${param.descricao}`} value={param.codigo || param.code} />
                ))}
              </Picker>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Valor Esperado</Text>
                <TextInput 
                  style={styles.inputCompact} 
                  placeholder="Ex: 30" 
                  keyboardType="numeric" 
                  value={valorEsperado} 
                  onChangeText={setValorEsperado} 
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Valor Nominal</Text>
                <TextInput 
                  style={styles.inputCompact} 
                  placeholder="Tolerância" 
                  keyboardType="numeric" 
                  value={valorNominal} 
                  onChangeText={setValorNominal} 
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Limite Mínimo</Text>
                <TextInput 
                  style={[styles.inputCompact, styles.inputCritico]} 
                  placeholder="Ex: 10" 
                  keyboardType="numeric" 
                  value={valorMinimo} 
                  onChangeText={setValorMinimo} 
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Limite Máximo</Text>
                <TextInput 
                  style={[styles.inputCompact, styles.inputCritico]} 
                  placeholder="Ex: 50" 
                  keyboardType="numeric" 
                  value={valorMaximo} 
                  onChangeText={setValorMaximo} 
                />
              </View>
            </View>

            {/* NOVO: CAMPO DE PORCENTAGEM DE ATENÇÃO */}
            <View style={[styles.row, { marginTop: 5 }]}>
              <View style={styles.col}>
                <Text style={styles.label}>Aviso de Atenção (%)</Text>
                <TextInput 
                  style={styles.inputCompact} 
                  placeholder="Ex: 80" 
                  keyboardType="numeric" 
                  value={margemAtencao} 
                  onChangeText={setMargemAtencao} 
                />
                <Text style={{fontSize: 10, color: '#64748b', marginTop: -5, marginBottom: 10}}>
                  Dispara quando atingir esta % da tolerância.
                </Text>
              </View>
            </View>

            <View style={styles.botoesRow}>
              <Pressable 
                style={[styles.saveButton, loading && styles.disabledButton]} 
                onPress={salvarAssociacao} 
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Aguarde...' : (idEmEdicao ? 'Atualizar Regra' : 'Gravar Regra')}
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

      {/* LISTA DE REGRAS PREDITIVAS */}
      <FlatList
        data={regras}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardCodigo}>{item.equipamento_Code}</Text>
                <Text style={styles.badgeParametro}>{item.parametro_Code}</Text>
              </View>
              
              <View style={styles.limitesRow}>
                <View style={styles.limiteBox}>
                  <Text style={styles.limiteLabel}>Min</Text>
                  <Text style={styles.limiteValor}>{item.valorMinimo}</Text>
                </View>
                <View style={styles.limiteBox}>
                  <Text style={styles.limiteLabel}>Esperado</Text>
                  <Text style={[styles.limiteValor, { color: '#16a34a' }]}>{item.valorEsperado}</Text>
                </View>
                <View style={styles.limiteBox}>
                  <Text style={styles.limiteLabel}>Max</Text>
                  <Text style={styles.limiteValor}>{item.valorMaximo}</Text>
                </View>
              </View>
            </Pressable>
            
            <Pressable onPress={() => confirmarDelecao(item.id!, item.equipamento_Code, item.parametro_Code)} style={styles.iconContainer}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma regra preditiva cadastrada.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  
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
  
  inputCompact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, paddingHorizontal: 12, marginBottom: 10, fontSize: 13, color: '#1e293b', height: 55, justifyContent: 'center' },
  inputCritico: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  
  pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, marginBottom: 10, justifyContent: 'center', height: 55 },
  pickerCompact: { height: 55, color: '#1e293b', fontSize: 13 },
  pickerItemCompact: { fontSize: 13 },

  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },

  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 6, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Estilos do Card (Lista)
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  cardCodigo: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  badgeParametro: { backgroundColor: '#e0f2fe', color: '#0369a1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold' },
  
  limitesRow: { flexDirection: 'row', gap: 15, marginTop: 8 },
  limiteBox: { alignItems: 'center' },
  limiteLabel: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  limiteValor: { fontSize: 14, color: '#1e293b', fontWeight: 'bold' },
  
  iconContainer: { padding: 5, marginLeft: 10 },
  deleteIcon: { fontSize: 20, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20, fontSize: 14 }
});