import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

type Familia = {
  id?: number;
  code?: string; // Algumas APIs devolvem 'code'
  codigo?: string; // Outras devolvem 'codigo'
  descricao: string;
};

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/FamiliaEquipamentos';

export default function CadastroFamilia() {
  const router = useRouter();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // NOVO: Estado para controlar a visibilidade do formulário (Acordeão)
  const [formVisible, setFormVisible] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);

  useEffect(() => {
    carregarFamilias();
  }, []);

  const carregarFamilias = async () => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const response = await axios.get<Familia[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFamilias(response.data);
    } catch (error) {
      console.error('Erro ao carregar famílias:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (familia: Familia) => {
    // Tenta pegar 'codigo' ou 'code', dependendo de como a API C# devolve
    const codigoDaFamilia = familia.codigo || familia.code || '';
    setCodigo(codigoDaFamilia);
    setDescricao(familia.descricao);
    setIdEmEdicao(familia.id!);
    setFormVisible(true); // Expande o formulário ao editar
  };

  const cancelarEdicao = () => {
    setCodigo('');
    setDescricao('');
    setIdEmEdicao(null);
    setFormVisible(false); // Recolhe o formulário ao cancelar
  };

  const salvarFamilia = async () => {
    if (!codigo || !descricao) {
      Alert.alert('Aviso', 'Preencha o código e a descrição.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const codigoFormatado = codigo.toUpperCase().trim();

      // Verifica se o código digitado já existe na lista
      const familiaExistente = familias.find(f => (f.codigo || f.code)?.toUpperCase() === codigoFormatado);

      // Define se vai atualizar ou inserir
      const idParaSalvar = idEmEdicao || (familiaExistente ? familiaExistente.id : null);

      // Payload com 'code' (conforme o seu código original) e 'codigo' para garantir compatibilidade
      const payload = { 
        id: idParaSalvar, 
        code: codigoFormatado, 
        codigo: codigoFormatado, 
        descricao: descricao 
      };

      if (idParaSalvar) {
        // Atualiza a família existente (PUT)
        await axios.put(`${API_URL}/${idParaSalvar}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Família atualizada com sucesso!');
      } else {
        // Cria uma nova família (POST)
        await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Família salva com sucesso!');
      }

      cancelarEdicao(); // Limpa os campos e fecha o acordeão
      carregarFamilias();
    } catch (error: any) {
      const erroBackend = error.response?.data?.title || error.response?.data || error.message;
      Alert.alert(
        'Erro na API', 
        `Não foi possível salvar.\nMotivo: ${typeof erroBackend === 'string' ? erroBackend : JSON.stringify(erroBackend)}`
      );
    } finally {
      setSalvando(false);
    }
  };

  const deletarFamilia = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (idEmEdicao === id) cancelarEdicao();
      
      carregarFamilias();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover. Esta família pode estar vinculada a equipamentos.');
    }
  };

  const confirmarDelecao = (id: number, codigoDesc: string) => {
    Alert.alert('Remover', `Deseja remover a família ${codigoDesc}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => deletarFamilia(id) }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Famílias de Equipamentos</Text>
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
            {idEmEdicao ? `Editando: ${codigo}` : '➕ Nova Família'}
          </Text>
          <Text style={styles.accordionIcon}>
            {formVisible ? '▲ Ocultar' : '▼ Expandir'}
          </Text>
        </Pressable>

        {/* CONTEÚDO DO FORMULÁRIO */}
        {formVisible && (
          <View style={styles.formBody}>
            <Text style={styles.label}>Código</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: MOTORES"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: Motores Elétricos Industriais"
              value={descricao}
              onChangeText={setDescricao}
            />

            <View style={styles.botoesRow}>
              <Pressable 
                style={[styles.saveButton, salvando && styles.disabledButton]} 
                onPress={salvarFamilia} 
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
        <ActivityIndicator size="large" color="#208AEF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={familias}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => {
            const codigoDisplay = item.codigo || item.code || '';
            return (
              <View style={styles.card}>
                <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
                  <Text style={styles.cardCodigo}>{codigoDisplay}</Text>
                  <Text style={styles.cardDescricao}>{item.descricao}</Text>
                </Pressable>
                
                <Pressable onPress={() => confirmarDelecao(item.id!, codigoDisplay)} style={styles.iconContainer}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma família cadastrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 15 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  title: { color: '#333', fontSize: 20, fontWeight: 'bold', maxWidth: '75%' },
  voltarButton: { backgroundColor: '#64748b', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  voltarText: { color: '#fff', fontWeight: 'bold' },
  
  // Estilos do Acordeão
  formContainer: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f8fafc' },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  accordionIcon: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  formBody: { padding: 15, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  
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
    height: 55,
    justifyContent: 'center'
  },

  botoesRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#208AEF', padding: 12, borderRadius: 6, alignItems: 'center' },
  disabledButton: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: '#ef4444', padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', elevation: 1 },
  cardCodigo: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  cardDescricao: { fontSize: 13, color: '#475569', marginTop: 4 },
  iconContainer: { padding: 5, marginLeft: 10 },
  deleteIcon: { fontSize: 20, color: '#ef4444' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 30, fontSize: 14 }
});