import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

type Unidade = {
  id?: number;
  codigo: string;
  descricao: string;
};

const API_URL = "https://qlvmzrjr-7008.brs.devtunnels.ms/api/Unidades";

export default function CadastroUnidades() {
  const router = useRouter();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Estado para controlar a visibilidade do formulário (Acordeão)
  const [formVisible, setFormVisible] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);

  useEffect(() => {
    carregarUnidades();
  }, []);

  const carregarUnidades = async () => {
    try {
      const token = await SecureStore.getItemAsync("jwtToken");
      const response = await axios.get<Unidade[]>(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnidades(response.data);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicao = (unidade: Unidade) => {
    setCodigo(unidade.codigo);
    setDescricao(unidade.descricao);
    setIdEmEdicao(unidade.id!);
    setFormVisible(true); // Expande o formulário ao editar
  };

  const cancelarEdicao = () => {
    setCodigo("");
    setDescricao("");
    setIdEmEdicao(null);
    setFormVisible(false); // Recolhe o formulário ao cancelar
  };
  
  const salvarUnidade = async () => {
    if (!codigo || !descricao) {
      Alert.alert('Aviso', 'Preencha código e descrição.');
      return;
    }

    setSalvando(true);
    try {
      const token = await SecureStore.getItemAsync('jwtToken');
      const codigoFormatado = codigo.toUpperCase().trim();

      const unidadeExistente = unidades.find(u => u.codigo === codigoFormatado);
      const idParaSalvar = idEmEdicao || (unidadeExistente ? unidadeExistente.id : null);

      // CORREÇÃO: Envia 0 se o ID for nulo para o C# não rejeitar
      const payload = { 
        id: idParaSalvar || 0,
        codigo: codigoFormatado, 
        descricao: descricao 
      };

      if (idParaSalvar) {
        await axios.put(`${API_URL}/${idParaSalvar}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Unidade atualizada com sucesso!');
      } else {
        await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Unidade salva com sucesso!');
      }

      cancelarEdicao(); // Limpa e fecha o formulário
      carregarUnidades();
    } catch (error: any) {
      // CORREÇÃO: Captura detalhada dos erros de validação do ASP.NET Core
      let mensagemErro = "Erro desconhecido";
      if (error.response?.data?.errors) {
        const erros = error.response.data.errors;
        mensagemErro = Object.keys(erros).map(key => erros[key].join('\n')).join('\n');
      } else {
        mensagemErro = error.response?.data?.title || error.response?.data || error.message;
      }

      Alert.alert(
        'Erro na API', 
        `Não foi possível salvar.\nMotivo: ${mensagemErro}`
      );
    } finally {
      setSalvando(false);
    }
  };

  const deletarUnidade = async (id: number) => {
    try {
      const token = await SecureStore.getItemAsync("jwtToken");
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (idEmEdicao === id) cancelarEdicao();
      carregarUnidades();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível remover, pode estar em uso por um parâmetro.");
    }
  };

  const confirmarDelecao = (id: number, codigo: string) => {
    Alert.alert("Remover", `Deseja remover a unidade ${codigo}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deletarUnidade(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Unidades de Medida</Text>
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
            {idEmEdicao ? `Editando: ${codigo}` : '➕ Nova Unidade'}
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
              placeholder="Ex: C"
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.inputCompact}
              placeholder="Ex: Graus Celsius"
              value={descricao}
              onChangeText={setDescricao}
            />

            <View style={styles.botoesRow}>
              <Pressable
                style={[styles.saveButton, salvando && styles.disabledButton]}
                onPress={salvarUnidade}
                disabled={salvando}
              >
                <Text style={styles.saveButtonText}>
                  {salvando ? "Aguarde..." : (idEmEdicao ? "Atualizar" : "Salvar")}
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
          data={unidades}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable style={{ flex: 1 }} onPress={() => prepararEdicao(item)}>
                <Text style={styles.cardCodigo}>{item.codigo}</Text>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
              </Pressable>

              <Pressable onPress={() => confirmarDelecao(item.id!, item.codigo)} style={styles.iconContainer}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma unidade cadastrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 15 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 15, marginTop: 10 },
  title: { color: "#333", fontSize: 20, fontWeight: "bold" },
  voltarButton: { backgroundColor: "#64748b", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  voltarText: { color: "#fff", fontWeight: "bold" },
  
  formContainer: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f8fafc' },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  accordionIcon: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  formBody: { padding: 15, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  
  label: { fontSize: 12, fontWeight: "bold", color: "#475569", marginBottom: 4 },
  inputCompact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#94a3b8', borderRadius: 6, paddingHorizontal: 12, marginBottom: 10, fontSize: 13, color: '#1e293b', height: 55, justifyContent: 'center' },

  botoesRow: { flexDirection: "row", gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: "#16a34a", padding: 12, borderRadius: 6, alignItems: "center" },
  disabledButton: { backgroundColor: "#94a3b8" },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  cancelButton: { flex: 1, backgroundColor: "#ef4444", padding: 12, borderRadius: 6, alignItems: "center" },
  cancelButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  card: { flexDirection: "row", backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", elevation: 1 },
  cardCodigo: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  cardDescricao: { fontSize: 13, color: "#475569", marginTop: 4 },
  iconContainer: { padding: 5, marginLeft: 10 },
  deleteIcon: { fontSize: 20, color: "#ef4444" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 30, fontSize: 14 },
});