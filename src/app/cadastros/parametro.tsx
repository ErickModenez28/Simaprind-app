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
      
      // Carrega parâmetros e unidades simultaneamente
      const [resParam, resUnidades] = await Promise.all([
        axios.get<Parametro[]>(API_PARAMETROS, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get<Unidade[]>(API_UNIDADES, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setParametros(resParam.data);
      setUnidades(resUnidades.data);
      
      // Se tiver unidades cadastradas, já deixa a primeira selecionada por padrão
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

  const salvarParametro = async () => {
    if (!codigo || !descricao || idUnidade === '') {
      Alert.alert('Aviso', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const novoParametro = {
        codigo: codigo.toUpperCase(),
        descricao,
        idUnidade: Number(idUnidade),
        tipoDado
      };

      await axios.post(API_PARAMETROS, novoParametro, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Parâmetro salvo com sucesso!');
      
      // Limpar formulário
      setCodigo('');
      setDescricao('');
      setTipoDado('NUMERICO');
      
      // Recarrega apenas os parâmetros para atualizar a lista
      const resParam = await axios.get<Parametro[]>(API_PARAMETROS, { headers: { Authorization: `Bearer ${token}` } });
      setParametros(resParam.data);

    } catch (error) {
      console.error('Erro ao salvar parâmetro:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar o parâmetro.');
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

  // Helper para mostrar a sigla da unidade no card
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

      {/* FORMULÁRIO DE CADASTRO */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Novo Parâmetro</Text>
        
        <Text style={styles.label}>Código</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: TEMP_01"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Temperatura do Óleo"
          value={descricao}
          onChangeText={setDescricao}
        />

        <Text style={styles.label}>Unidade de Medida</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={idUnidade}
            onValueChange={(itemValue) => setIdUnidade(itemValue)}
            style={styles.picker}
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

        <Text style={styles.label}>Tipo de Dado</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={tipoDado}
            onValueChange={(itemValue) => setTipoDado(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Numérico" value="NUMERICO" />
            <Picker.Item label="Texto" value="TEXTO" />
          </Picker>
        </View>

        <Pressable 
          style={[styles.saveButton, salvando && styles.disabledButton]} 
          onPress={salvarParametro}
          disabled={salvando}
        >
          <Text style={styles.saveButtonText}>
            {salvando ? 'Salvando...' : 'Salvar Parâmetro'}
          </Text>
        </Pressable>
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
              <View style={{ flex: 1 }}>
                <Text style={styles.cardCodigo}>{item.codigo}</Text>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
                <View style={styles.badges}>
                  <Text style={styles.badge}>{getSiglaUnidade(item.idUnidade)}</Text>
                  <Text style={styles.badge}>{item.tipoDado}</Text>
                </View>
              </View>
              <Pressable onPress={() => confirmarDelecao(item.id!, item.codigo)}>
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
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  title: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  voltarButton: { backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
  voltarText: { color: '#fff', fontWeight: 'bold' },
  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 3 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#94a3b8', borderRadius: 8, padding: 14, marginBottom: 15, fontSize: 16, color: '#1e293b' },
  pickerWrapper: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#94a3b8', borderRadius: 8, marginBottom: 20, overflow: 'hidden' },
  picker: { height: 55 },
  saveButton: { backgroundColor: '#16a34a', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  cardCodigo: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardDescricao: { fontSize: 14, color: '#475569', marginTop: 4, marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, color: '#475569', fontWeight: 'bold' },
  deleteIcon: { fontSize: 22, marginLeft: 15, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30, fontSize: 15 }
});