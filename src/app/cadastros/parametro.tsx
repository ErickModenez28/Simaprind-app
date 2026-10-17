import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';

type Parametro = {
  id?: number;
  codigo: string;
  descricao: string;
  idUnidade: number;
  tipoDado: string;
};

type Unidade = {
  id: number;
  codigo: string;
  descricao: string;
};

const API_PARAMETROS = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Parametros';
const API_UNIDADES = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Unidades';

export default function CadastroParametros() {
  const router = useRouter();
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estados do Formulário
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [idUnidade, setIdUnidade] = useState<number | ''>('');
  const [tipoDado, setTipoDado] = useState('NUMERICO');

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      
      const [resParam, resUnidades] = await Promise.all([
        axios.get<Parametro[]>(API_PARAMETROS, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get<Unidade[]>(API_UNIDADES, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setParametros(resParam.data);
      setUnidades(resUnidades.data);
      
      if (resUnidades.data.length > 0) {
        setIdUnidade(resUnidades.data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar as listas.');
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (param: Parametro) => {
    setCodigo(param.codigo);
    setDescricao(param.descricao);
    setIdUnidade(param.idUnidade);
    setTipoDado(param.tipoDado || 'NUMERICO');
    setIdEmEdicao(param.id!);
  };

  const cancelarEdicao = () => {
    setCodigo('');
    setDescricao('');
    if (unidades.length > 0) setIdUnidade(unidades[0].id);
    setTipoDado('NUMERICO');
    setIdEmEdicao(null);
  };

  const salvarParametro = async () => {
    if (!codigo || !descricao || idUnidade === '') {
      Alert.alert('Aviso', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const codigoFormatado = codigo.toUpperCase().trim();

      const parametroExistente = parametros.find(p => p.codigo === codigoFormatado);
      const idParaSalvar = idEmEdicao || (parametroExistente ? parametroExistente.id : null);

      const payload = {
        id: idParaSalvar,
        codigo: codigoFormatado,
        descricao,
        idUnidade: Number(idUnidade),
        tipoDado
      };

      if (idParaSalvar) {
        // Atualizar (PUT)
        await axios.put(`${API_PARAMETROS}/${idParaSalvar}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Parâmetro atualizado com sucesso!');
      } else {
        // Criar (POST)
        await axios.post(API_PARAMETROS, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Parâmetro salvo com sucesso!');
      }
      
      cancelarEdicao();
      
      // Recarrega apenas os parâmetros para atualizar a lista
      const resParam = await axios.get<Parametro[]>(API_PARAMETROS, { headers: { Authorization: `Bearer ${token}` } });
      setParametros(resParam.data);

    } catch (error: any) {
      const erroBackend = error.response?.data?.title || error.response?.data || error.message;
      Alert.alert('Erro', `Ocorreu um erro ao salvar.\nMotivo: ${typeof erroBackend === 'string' ? erroBackend : JSON.stringify(erroBackend)}`);
    } finally {
      setSalvando(false);
    }
  };

  const deletarParametro = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.delete(`${API_PARAMETROS}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (idEmEdicao === id) cancelarEdicao();
      
      const resParam = await axios.get<Parametro[]>(API_PARAMETROS, { headers: { Authorization: `Bearer ${token}` } });
      setParametros(resParam.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover este parâmetro.');
    }
  };

  const confirmarDelecao = (id: number, codigo: string) => {
    Alert.alert('Remover Parâmetro', `Deseja remover o parâmetro ${codigo}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deletarParametro(id) }
    ]);
  };

  const getSiglaUnidade = (id: number) => {
    const un = unidades.find(u => u.id === id);
    return un ? un.codigo : `ID: ${id}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parâmetros</Text>
        <Pressable onPress={() => router.back()} style={styles.voltarButton}>
          <Text style={styles.voltarText}>Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {idEmEdicao ? `Editando: ${codigo}` : 'Novo Parâmetro'}
        </Text>
        
        {/* ROW 1: Lado a Lado (Código e Tipo de Dado) para poupar espaço */}
        <View style={styles.row}>
          <View style={styles.colHalf}>
            <Text style={styles.label}>Código</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: TEMP_01"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.colHalf}>
            <Text style={styles.label}>Tipo de Dado</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tipoDado}
                onValueChange={(itemValue) => setTipoDado(itemValue)}
                style={styles.pickerCompact}
              >
                <Picker.Item label="Numérico" value="NUMERICO" />
                <Picker.Item label="Texto" value="TEXTO" />
              </Picker>
            </View>
          </View>
        </View>

        {/* ROW 2: Descrição */}
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.inputCompact}
          placeholder="Ex: Temperatura do Óleo"
          value={descricao}
          onChangeText={setDescricao}
        />

        {/* ROW 3: Unidade de Medida */}
        <Text style={styles.label}>Unidade de Medida</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={idUnidade}
            onValueChange={(itemValue) => setIdUnidade(itemValue)}
            style={styles.pickerCompact}
          >
            {unidades.map((unidade) => (
              <Picker.Item 
                key={unidade.id} 
                label={`${unidade.codigo} - ${unidade.descricao}`} 
                value={unidade.id} 
              />
            ))}
          </Picker>
        </View>

        <View style={styles.botoesRow}>
          <Pressable 
            style={[styles.saveButton, salvando && styles.disabledButton]} 
            onPress={salvarParametro}
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

      {/* LISTA DE PARÂMETROS */}
      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={parametros}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
                <Text style={styles.cardCodigo}>{item.codigo}</Text>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
                <View style={styles.badges}>
                  <Text style={styles.badge}>{getSiglaUnidade(item.idUnidade)}</Text>
                  <Text style={styles.badge}>{item.tipoDado}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => confirmarDelecao(item.id!, item.codigo)} style={styles.iconContainer}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum parâmetro cadastrado.</Text>}
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
  
  // CONTAINER COMPACTADO
  formContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  
  inputCompact: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#94a3b8', 
    borderRadius: 6, 
    paddingHorizontal: 12, 
    marginBottom: 10, 
    fontSize: 14, 
    color: '#1e293b',
    height: 60, // <-- Altura igual à do pickerContainer
    justifyContent: 'center'
  },pickerContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, marginBottom: 10, height: 60, justifyContent: 'center' },
  pickerCompact: { height: 60 },
  
  // GRID
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  colHalf: { width: '48%' },

  // BOTÕES
  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 6, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  // LISTA
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  cardCodigo: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  cardDescricao: { fontSize: 13, color: '#475569', marginTop: 2, marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, color: '#475569', fontWeight: 'bold' },
  iconContainer: { padding: 5 },
  deleteIcon: { fontSize: 20, marginLeft: 10, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 20, fontSize: 14 }
});