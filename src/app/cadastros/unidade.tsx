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
  };

  const cancelarEdicao = () => {
    setCodigo("");
    setDescricao("");
    setIdEmEdicao(null);
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

      // Verifica se o código digitado já existe na lista carregada
      const unidadeExistente = unidades.find(u => u.codigo === codigoFormatado);

      // Define se vai usar o ID que está em edição (clicado) OU o ID da unidade encontrada pela busca acima
      const idParaSalvar = idEmEdicao || (unidadeExistente ? unidadeExistente.id : null);

      // NOVO: Adicionamos o 'id' no payload, pois muitas APIs C# exigem isso no PUT
      const payload = { 
        id: idParaSalvar, 
        codigo: codigoFormatado, 
        descricao: descricao 
      };

      if (idParaSalvar) {
        // Atualiza a unidade existente (PUT)
        await axios.put(`${API_URL}/${idParaSalvar}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Unidade atualizada com sucesso!');
      } else {
        // Cria uma nova unidade (POST)
        await axios.post(API_URL, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Sucesso', 'Unidade salva com sucesso!');
      }

      cancelarEdicao();
      carregarUnidades();
    } catch (error: any) {
      // NOVO: Captura o erro real devolvido pela sua API C#
      const erroBackend = error.response?.data?.title || error.response?.data || error.message;
      console.error("Erro detalhado da API:", error.response?.data);
      
      Alert.alert(
        'Erro na API', 
        `Não foi possível salvar.\nMotivo: ${typeof erroBackend === 'string' ? erroBackend : JSON.stringify(erroBackend)}`
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

      // Se apagar a unidade que estava a ser editada, limpa o formulário
      if (idEmEdicao === id) cancelarEdicao();

      carregarUnidades();
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível remover, pode estar em uso por um parâmetro.",
      );
    }
  };

  const confirmarDelecao = (id: number, codigo: string) => {
    Alert.alert("Remover", `Deseja remover a unidade ${codigo}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => deletarUnidade(id),
      },
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
        <Text style={styles.formTitle}>
          {idEmEdicao ? `Editando: ${codigo}` : "Nova Unidade"}
        </Text>

        <Text style={styles.label}>Código</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: C"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.input}
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
              {salvando
                ? "Aguarde..."
                : idEmEdicao
                  ? "Atualizar"
                  : "Salvar Unidade"}
            </Text>
          </Pressable>

          {idEmEdicao !== null && (
            <Pressable style={styles.cancelButton} onPress={cancelarEdicao}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" />
      ) : (
        <FlatList
          data={unidades}
          keyExtractor={(item) => item.id!.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Clicar no texto aciona a edição */}
              <Pressable
                style={{ flex: 1 }}
                onPress={() => prepararEdicao(item)}
              >
                <Text style={styles.cardCodigo}>{item.codigo}</Text>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
              </Pressable>

              {/* O ícone da lixeira continua isolado para exclusão */}
              <Pressable
                onPress={() => confirmarDelecao(item.id!, item.codigo)}
                style={styles.iconContainer}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhuma unidade cadastrada.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    marginTop: 10,
  },
  title: { color: "#333", fontSize: 20, fontWeight: "bold" },
  voltarButton: {
    backgroundColor: "#64748b",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  voltarText: { color: "#fff", fontWeight: "bold" },
  formContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#94a3b8",
    borderRadius: 8,
    padding: 14,
    marginBottom: 15,
    fontSize: 16,
    color: "#1e293b",
  },

  // Layout dos Botões
  botoesRow: { flexDirection: "row", gap: 10, marginTop: 5 },
  saveButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#94a3b8" },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    elevation: 1,
  },
  cardCodigo: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  cardDescricao: { fontSize: 14, color: "#475569", marginTop: 4 },
  iconContainer: { padding: 5 },
  deleteIcon: { fontSize: 22, color: "#ef4444" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 30, fontSize: 15 },
});
