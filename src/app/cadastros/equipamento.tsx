import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

// Substitua pelo seu Dev Tunnel atual
const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api'; 

export default function CadastroEquipamento() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  // Estados do formulário
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [familiaCode, setFamiliaCode] = useState('');
  const [localizacaoPkey, setLocalizacaoPkey] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Estados das listas (Dropdowns)
  const [familias, setFamilias] = useState<any[]>([]);
  const [localizacoes, setLocalizacoes] = useState<any[]>([]);

  useEffect(() => {
    carregarDadosBase();
  }, []);

  const carregarDadosBase = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const headers = { Authorization: `Bearer ${token}` };

// Dentro do carregarDadosBase no CadastroEquipamento.tsx
      const [resFamilias, resLocalizacoes] = await Promise.all([
        axios.get(`${API_URL}/Familias`, { headers }), // <-- Ajustado para /Familias
        axios.get(`${API_URL}/Localizacoes`, { headers })
      ]);

      setFamilias(resFamilias.data);
      setLocalizacoes(resLocalizacoes.data);
    } catch (error: any) {
      // ESTA LINHA VAI DEDURAR QUAL API QUEBROU E O PORQUÊ
      console.error("ERRO AO CARREGAR DADOS BASE: ", error.message, error.response?.status, error.response?.data);
      Alert.alert('Erro', 'Não foi possível carregar as Famílias e Localizações.');
    } finally {
      setLoadingDados(false);
    }
  };

  const salvarEquipamento = async () => {
    if (!codigo.trim() || !descricao.trim() || !familiaCode || !localizacaoPkey) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      
      await axios.post(`${API_URL}/Equipamentos`, {
        id: 0,
        codigo: codigo.trim(),
        descricao: descricao.trim(),
        // Substitua familia_Code e localizacao_Pkey pelos nomes corretos da API:
        idFamilia: Number(familiaCode), 
        idLocalizacao: Number(localizacaoPkey),
        ativo: ativo ? 1 : 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Equipamento cadastrado com sucesso!');
      router.back(); // Volta para a tela anterior
    } catch (error: any) {
      // Captura detalhada de erro do backend igual fizemos na Localização
      const detalhesErro = error.response?.data?.errors || error.response?.data || error.message;
      console.log("DETALHES DO ERRO 400 (Equipamentos): ", detalhesErro);
      Alert.alert('Erro na API', JSON.stringify(detalhesErro));
    } finally {
      setLoading(false);
    }
  };

  if (loadingDados) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text>Carregando formulário...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Novo Equipamento</Text>

      <Text style={styles.label}>Código do Equipamento *</Text>
      <TextInput style={styles.input} placeholder="Ex: MOT-001" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />

      <Text style={styles.label}>Descrição *</Text>
      <TextInput style={styles.input} placeholder="Ex: Motor Elétrico Principal" value={descricao} onChangeText={setDescricao} />

<Text style={styles.label}>Família do Equipamento *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={familiaCode} onValueChange={(itemValue) => setFamiliaCode(itemValue)}>
          <Picker.Item label="Selecione uma família..." value="" />
          {familias.map((fam) => (
            /* CORREÇÃO AQUI: o value agora é fam.id */
            <Picker.Item key={fam.id} label={`${fam.codigo} - ${fam.descricao}`} value={fam.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Localização *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={localizacaoPkey} onValueChange={(itemValue) => setLocalizacaoPkey(itemValue)}>
          <Picker.Item label="Selecione um local..." value="" />
          {localizacoes.map((loc) => (
            /* CORRIGIDO: loc.pkey virou loc.id */
            <Picker.Item key={loc.id} label={`${loc.codigo} - ${loc.descricao}`} value={loc.id} />
          ))}
        </Picker>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.labelSwitch}>Equipamento Ativo?</Text>
        <Switch value={ativo} onValueChange={setAtivo} trackColor={{ false: "#767577", true: "#208AEF" }} />
      </View>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={salvarEquipamento} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar Equipamento</Text>}
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
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, marginTop: 10, backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  labelSwitch: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  button: { backgroundColor: '#208AEF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#208AEF' },
  buttonOutlineText: { color: '#208AEF', fontSize: 16, fontWeight: 'bold' }
});