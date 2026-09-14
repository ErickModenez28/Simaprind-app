import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api';

export default function AssociarParametro() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  // Listas para os Dropdowns
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [parametros, setParametros] = useState<any[]>([]);

  // Estados do formulário
  const [equipamentoCode, setEquipamentoCode] = useState('');
  const [parametroCode, setParametroCode] = useState('');
  const [valorEsperado, setValorEsperado] = useState('');
  const [valorNominal, setValorNominal] = useState('');
  const [valorMinimo, setValorMinimo] = useState('');
  const [valorMaximo, setValorMaximo] = useState('');

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const headers = { Authorization: `Bearer ${token}` };

      // Busca equipamentos e parâmetros simultaneamente
      const [resEquipamentos, resParametros] = await Promise.all([
        axios.get(`${API_URL}/Equipamentos`, { headers }),
        axios.get(`${API_URL}/Parametros`, { headers })
      ]);

      setEquipamentos(resEquipamentos.data);
      setParametros(resParametros.data);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar as listas de equipamentos e parâmetros.');
    } finally {
      setLoadingDados(false);
    }
  };

  const salvarAssociacao = async () => {
    if (!equipamentoCode || !parametroCode || !valorEsperado || !valorNominal || !valorMinimo || !valorMaximo) {
      Alert.alert('Atenção', 'Preencha todos os campos para a análise preditiva.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      
      await axios.post(`${API_URL}/ParametrosEquipamentos`, {
        equipamento_Code: equipamentoCode,
        parametro_Code: parametroCode,
        possui_Valor: 1,
        valorEsperado: parseFloat(valorEsperado.replace(',', '.')),
        valorNominal: parseFloat(valorNominal.replace(',', '.')),
        valorMinimo: parseFloat(valorMinimo.replace(',', '.')),
        valorMaximo: parseFloat(valorMaximo.replace(',', '.'))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Parâmetro vinculado com sucesso ao equipamento!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao vincular o parâmetro.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingDados) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Regras Preditivas</Text>

      <Text style={styles.label}>Equipamento *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={equipamentoCode} onValueChange={setEquipamentoCode}>
          <Picker.Item label="Selecione o equipamento..." value="" />
          {equipamentos.map((eq) => (
            <Picker.Item key={eq.code} label={`${eq.code} - ${eq.descricao}`} value={eq.code} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Parâmetro de Leitura *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={parametroCode} onValueChange={setParametroCode}>
          <Picker.Item label="Ex: Temperatura, Vibração..." value="" />
          {parametros.map((param) => (
            <Picker.Item key={param.code} label={param.descricao} value={param.code} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Valor Esperado (Ideal) *</Text>
      <TextInput style={styles.input} placeholder="Ex: 30" keyboardType="numeric" value={valorEsperado} onChangeText={setValorEsperado} />

      <Text style={styles.label}>Valor Nominal (Tolerância) *</Text>
      <TextInput style={styles.input} placeholder="Ex: 10 (Atenção dispara em 8)" keyboardType="numeric" value={valorNominal} onChangeText={setValorNominal} />

      <Text style={styles.label}>Limite Mínimo Crítico *</Text>
      <TextInput style={styles.input} placeholder="Ex: 10" keyboardType="numeric" value={valorMinimo} onChangeText={setValorMinimo} />

      <Text style={styles.label}>Limite Máximo Crítico *</Text>
      <TextInput style={styles.input} placeholder="Ex: 50" keyboardType="numeric" value={valorMaximo} onChangeText={setValorMaximo} />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={salvarAssociacao} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Vincular Parâmetro</Text>}
      </Pressable>
      
      <Pressable style={styles.buttonOutline} onPress={() => router.back()}>
        <Text style={styles.buttonOutlineText}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  pickerContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, overflow: 'hidden' },
  button: { backgroundColor: '#208AEF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#208AEF' },
  buttonOutlineText: { color: '#208AEF', fontSize: 16, fontWeight: 'bold' }
});