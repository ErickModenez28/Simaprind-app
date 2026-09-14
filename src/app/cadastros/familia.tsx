import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api';

export default function CadastroFamilia() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Estados do formulário
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');

  const salvarFamilia = async () => {
    if (!codigo.trim() || !descricao.trim()) {
      Alert.alert('Atenção', 'Código e Descrição são obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      
      await axios.post(`${API_URL}/FamiliaEquipamentos`, {
        code: codigo.trim(),
        descricao: descricao.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Sucesso', 'Família de equipamentos cadastrada com sucesso!');
      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao cadastrar a família.');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Nova Família</Text>

      <Text style={styles.label}>Código da Família *</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Ex: MOTORES" 
        value={codigo} 
        onChangeText={setCodigo} 
        autoCapitalize="characters" 
      />

      <Text style={styles.label}>Descrição *</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Ex: Motores Elétricos Industriais" 
        value={descricao} 
        onChangeText={setDescricao} 
      />

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={salvarFamilia} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar Família</Text>}
      </Pressable>
      
      <Pressable style={styles.buttonOutline} onPress={() => router.back()}>
        <Text style={styles.buttonOutlineText}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, color: '#666', marginBottom: 5, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#208AEF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10, marginTop: 10 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonOutline: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#208AEF' },
  buttonOutlineText: { color: '#208AEF', fontSize: 16, fontWeight: 'bold' }
});