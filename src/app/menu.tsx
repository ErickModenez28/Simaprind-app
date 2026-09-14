import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function MenuCadastros() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestão do Sistema</Text>
        <Text style={styles.subTitle}>Cadastros e Regras Preditivas</Text>
      </View>

      <Text style={styles.sectionTitle}>Cadastros Estruturais</Text>
      <View style={styles.grid}>
        <Pressable style={styles.card} onPress={() => router.push('/cadastros/equipamento')}>
          <Text style={styles.cardTitle}>Equipamentos</Text>
          <Text style={styles.cardDesc}>Cadastrar novos ativos</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push('/cadastros/localizacao')}>
          <Text style={styles.cardTitle}>Localização</Text>
          <Text style={styles.cardDesc}>Mapear planta industrial</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={() => router.push('/cadastros/familia')}>
          <Text style={styles.cardTitle}>Famílias</Text>
          <Text style={styles.cardDesc}>Agrupar equipamentos</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Regras de Negócio</Text>
      <Pressable style={styles.cardFull} onPress={() => router.push('/cadastros/associar-parametro')}>
        <Text style={styles.cardTitle}>Limites Preditivos (N:N)</Text>
        <Text style={styles.cardDesc}>Definir Valor Nominal e Limites de Alerta/Crítico por ativo.</Text>
      </Pressable>

      <Pressable style={styles.buttonOutline} onPress={() => router.back()}>
        <Text style={styles.buttonOutlineText}>Voltar ao Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#102C57', padding: 25, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subTitle: { color: '#8AB4F8', fontSize: 14, marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginHorizontal: 20, marginBottom: 15, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: '47%', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  cardFull: { backgroundColor: '#fff', marginHorizontal: 15, padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#102C57', marginBottom: 5 },
  cardDesc: { fontSize: 12, color: '#666' },
  buttonOutline: { marginHorizontal: 20, marginTop: 20, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#102C57', alignItems: 'center' },
  buttonOutlineText: { color: '#102C57', fontSize: 16, fontWeight: 'bold' }
});