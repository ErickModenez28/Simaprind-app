import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

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

      Alert.alert('Sucesso', 'Regra preditiva vinculada com sucesso!');
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

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Vincular Parâmetro ao Ativo</Text>

          <Text style={styles.label}>Equipamento *</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={equipamentoCode} onValueChange={setEquipamentoCode} style={styles.picker}>
              <Picker.Item label="Selecione o equipamento..." value="" />
              {equipamentos.map((eq) => (
                <Picker.Item 
                  key={eq.codigo || eq.code} 
                  label={`${eq.codigo || eq.code} - ${eq.descricao || eq.nome}`} 
                  value={eq.codigo || eq.code} 
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Parâmetro de Leitura *</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={parametroCode} onValueChange={setParametroCode} style={styles.picker}>
              <Picker.Item label="Ex: Temperatura, Vibração..." value="" />
              {parametros.map((param) => (
                <Picker.Item 
                  key={param.codigo || param.code} 
                  label={`${param.codigo || param.code} - ${param.descricao}`} 
                  value={param.codigo || param.code} 
                />
              ))}
            </Picker>
          </View>

          {/* CAMPOS NUMÉRICOS ALINHADOS LADO A LADO */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Valor Esperado</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: 30" 
                keyboardType="numeric" 
                value={valorEsperado} 
                onChangeText={setValorEsperado} 
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Valor Nominal</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Tolerância (Ex: 5)" 
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
                style={[styles.input, styles.inputCritico]} 
                placeholder="Ex: 10" 
                keyboardType="numeric" 
                value={valorMinimo} 
                onChangeText={setValorMinimo} 
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Limite Máximo</Text>
              <TextInput 
                style={[styles.input, styles.inputCritico]} 
                placeholder="Ex: 50" 
                keyboardType="numeric" 
                value={valorMaximo} 
                onChangeText={setValorMaximo} 
              />
            </View>
          </View>

          <Pressable 
            style={[styles.saveButton, loading && styles.disabledButton]} 
            onPress={salvarAssociacao} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Gravar Regra Preditiva</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 10, paddingHorizontal: 20 },
  title: { color: '#333', fontSize: 20, fontWeight: 'bold' },
  voltarButton: { backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 },
  voltarText: { color: '#fff', fontWeight: 'bold' },

  formContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', elevation: 3 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
  
  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 2, 
    borderColor: '#94a3b8', 
    borderRadius: 8, 
    padding: 14, 
    marginBottom: 15, 
    fontSize: 16, 
    color: '#1e293b' 
  },
  
  inputCritico: {
    borderColor: '#ef4444', // Borda vermelha para destacar que é um limite crítico
    backgroundColor: '#fef2f2'
  },
  
  pickerWrapper: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 2, 
    borderColor: '#94a3b8', 
    borderRadius: 8, 
    marginBottom: 20, 
    overflow: 'hidden' 
  },
  picker: { height: 55 },

  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  saveButton: { backgroundColor: '#16a34a', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});