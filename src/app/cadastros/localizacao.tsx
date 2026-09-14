import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

// Substitua pelo seu Dev Tunnel atual se ele mudar
const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api';

export default function CadastroLocalizacao() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDados, setLoadingDados] = useState(true);

  // Lista para o Dropdown de Localização Pai
  const [localizacoes, setLocalizacoes] = useState<any[]>([]);

  // Estados do formulário
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codePai, setCodePai] = useState('');
  const [isDeposito, setIsDeposito] = useState(false);
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    carregarLocalizacoes();
  }, []);

  const carregarLocalizacoes = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const response = await axios.get(`${API_URL}/Localizacoes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocalizacoes(response.data);
    } catch (error) {
      Alert.alert('Aviso', 'Não foi possível carregar as localizações existentes (ou a lista está vazia).');
    } finally {
      setLoadingDados(false);
    }
  };

  const salvarLocalizacao = async () => {
    if (!codigo.trim() || !descricao.trim()) {
      Alert.alert('Atenção', 'Código e Descrição são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      
      await axios.post(`${API_URL}/Localizacoes`, {
        code: codigo.trim(),
        descricao: descricao.trim(),
        code_Pai: codePai === '' ? null : codePai, // Se vazio, é o nível raiz
        deposito: isDeposito ? 1 : 0,
        nivel: codePai === '' ? 1 : 2, // Lógica simplificada para o TCC
        ativo: ativo ? 1 : 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Localização cadastrada com sucesso!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao cadastrar localização.');
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
      <Text style={styles.title}>Nova Localização</Text>

      <Text style={styles.label}>Código do Local *</Text>
      <TextInput style={styles.input} placeholder="Ex: SET-MOAGEM" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />

      <Text style={styles.label}>Descrição *</Text>
      <TextInput style={styles.input} placeholder="Ex: Setor de Moagem Principal" value={descricao} onChangeText={setDescricao} />

      <Text style={styles.label}>Pertence a qual local? (Hierarquia)</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={codePai} onValueChange={setCodePai}>
          <Picker.Item label="Nenhum (Nível Principal)" value="" />
          {localizacoes.map((loc) => (
            <Picker.Item key={loc.code} label={`${loc.code} - ${loc.descricao}`} value={loc.code} />
          ))}
        </Picker>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.labelSwitch}>É um Depósito?</Text>
        <Switch value={isDeposito} onValueChange={setIsDeposito} trackColor={{ false: "#767577", true: "#208AEF" }} />
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.labelSwitch}>Local Ativo?</Text>
        <Switch value={ativo} onValueChange={setAtivo} trackColor={{ false: "#767577", true: "#208AEF" }} />
      </View>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={salvarLocalizacao} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar Localização</Text>}
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
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  labelSwitch: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  button: { backgroundColor: '#208AEF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#208AEF' },
  buttonOutlineText: { color: '#208AEF', fontSize: 16, fontWeight: 'bold' }
});