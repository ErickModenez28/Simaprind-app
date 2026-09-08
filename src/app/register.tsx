import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Auth/cadastrar';

type RegisterResponse = {
	message?: string;
};

export default function RegisterScreen() {
	const router = useRouter();
	const [nome, setNome] = useState('');
	const [email, setEmail] = useState('');
	const [senha, setSenha] = useState('');
	const [mostrarSenha, setMostrarSenha] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mensagem, setMensagem] = useState('');
	const [erro, setErro] = useState('');

	const cadastrar = async () => {
		if (!nome.trim() || !email.trim() || !senha) {
			setErro('Preencha nome, email e senha.');
			setMensagem('');
			return;
		}

		setErro('');
		setMensagem('');
		setLoading(true);

		try {
			const response = await axios.post<RegisterResponse>(API_URL, {
				nome: nome.trim(),
				email: email.trim(),
				senha,
			});

			setMensagem(response.data.message ?? 'Cadastro realizado com sucesso.');
			setTimeout(() => router.replace('/'), 800);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 409) {
					setErro('Este email já está cadastrado.');
				} else if (!error.response) {
					setErro('Não foi possível conectar à API.');
				} else {
					setErro('Não foi possível realizar o cadastro.');
				}
			} else {
				setErro('Ocorreu um erro inesperado. Tente novamente.');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.form}>
				<Text style={styles.title}>Criar conta</Text>
				<Text style={styles.subtitle}>Cadastre-se no SIMAPRIND</Text>

				<TextInput
					style={styles.input}
					placeholder="Nome"
					autoCapitalize="words"
					value={nome}
					onChangeText={setNome}
				/>
				<TextInput
					style={styles.input}
					placeholder="Email"
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="email-address"
					value={email}
					onChangeText={setEmail}
				/>

				<View style={styles.passwordContainer}>
					<TextInput
						style={styles.passwordInput}
						placeholder="Senha"
						secureTextEntry={!mostrarSenha}
						value={senha}
						onChangeText={setSenha}
					/>
					<Pressable
						accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
						onPress={() => setMostrarSenha((atual) => !atual)}
						style={styles.togglePasswordButton}>
						<Text style={styles.togglePasswordText}>
							{mostrarSenha ? 'Ocultar' : 'Mostrar'}
						</Text>
					</Pressable>
				</View>

				{!!erro && <Text style={styles.error}>{erro}</Text>}
				{!!mensagem && <Text style={styles.success}>{mensagem}</Text>}

				<Pressable
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={cadastrar}
					disabled={loading}>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Cadastrar</Text>
					)}
				</Pressable>

				<Pressable onPress={() => router.replace('/')} style={styles.backButton}>
					<Text style={styles.backText}>Já tenho uma conta. Entrar</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 24 },
	form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
	title: { color: '#333', fontSize: 30, fontWeight: 'bold', textAlign: 'center' },
	subtitle: { color: '#666', marginBottom: 28, marginTop: 8, textAlign: 'center' },
	input: {
		backgroundColor: '#fff',
		borderColor: '#ddd',
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 16,
		marginBottom: 14,
		padding: 14,
	},
	passwordContainer: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderColor: '#ddd',
		borderRadius: 8,
		borderWidth: 1,
		flexDirection: 'row',
		marginBottom: 14,
	},
	passwordInput: { flex: 1, fontSize: 16, padding: 14 },
	togglePasswordButton: { paddingHorizontal: 14, paddingVertical: 10 },
	togglePasswordText: { color: '#208AEF', fontWeight: 'bold' },
	error: { color: '#c0392b', marginBottom: 14, textAlign: 'center' },
	success: { color: '#218c4b', marginBottom: 14, textAlign: 'center' },
	button: { alignItems: 'center', backgroundColor: '#208AEF', borderRadius: 8, padding: 15 },
	buttonDisabled: { opacity: 0.7 },
	buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
	backButton: { alignItems: 'center', marginTop: 20, padding: 8 },
	backText: { color: '#208AEF', fontSize: 14, fontWeight: 'bold' },
});