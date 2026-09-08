import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'https://qlvmzrjr-7008.brs.devtunnels.ms/api/Auth/login';
const TOKEN_KEY = 'jwtToken';
const EMAIL_KEY = 'loginEmail';

type LoginResponse = {
	token?: string;
	accessToken?: string;
};

export default function LoginScreen() {
	const router = useRouter();
	const { erro: erroParametro } = useLocalSearchParams<{ erro?: string }>();
	const [email, setEmail] = useState('');
	const [senha, setSenha] = useState('');
	const [mostrarSenha, setMostrarSenha] = useState(false);
	const [loading, setLoading] = useState(false);
	const [verificandoSessao, setVerificandoSessao] = useState(true);
	const [erro, setErro] = useState(
		erroParametro === 'sessao' ? 'Sessão expirada ou sem acesso aos alertas.' : '',
	);

	useEffect(() => {
		const restaurarSessao = async () => {
			try {
				const [token, emailSalvo] = await Promise.all([
					SecureStore.getItemAsync(TOKEN_KEY),
					SecureStore.getItemAsync(EMAIL_KEY),
				]);

				if (emailSalvo) setEmail(emailSalvo);

				if (token && erroParametro !== 'sessao') {
					router.replace('/dashboard' as never);
				}
			} finally {
				setVerificandoSessao(false);
			}
		};

		restaurarSessao();
	}, [erroParametro, router]);

	const entrar = async () => {
		if (!email.trim() || !senha) {
			setErro('Informe o email e a senha.');
			return;
		}

		setErro('');
		setLoading(true);

		try {
			const response = await axios.post<LoginResponse>(API_URL, {
				email: email.trim(),
				senha,
			});

			const token = response.data.token ?? response.data.accessToken;

			if (!token) {
				setErro('A API autenticou, mas não retornou um token JWT.');
				return;
			}

			await SecureStore.setItemAsync(TOKEN_KEY, token);
			await SecureStore.setItemAsync(EMAIL_KEY, email.trim());
			router.replace('/dashboard' as never);
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				setErro('Usuário ou senha inválidos.');
			} else {
				setErro('Não foi possível realizar o login.');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.form}>
				<Text style={styles.title}>SIMAPRIND</Text>
				<Text style={styles.subtitle}>Acesse o monitoramento industrial</Text>

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

				<Pressable
					style={[styles.button, (loading || verificandoSessao) && styles.buttonDisabled]}
					onPress={entrar}
					disabled={loading || verificandoSessao}>
					{loading || verificandoSessao ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Entrar</Text>
					)}
				</Pressable>

				<Pressable onPress={() => router.push('/register' as never)} style={styles.registerButton}>
					<Text style={styles.registerText}>Criar uma conta</Text>
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
	button: { alignItems: 'center', backgroundColor: '#208AEF', borderRadius: 8, padding: 15 },
	buttonDisabled: { opacity: 0.7 },
	buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
	registerButton: { alignItems: 'center', marginTop: 20, padding: 8 },
	registerText: { color: '#208AEF', fontSize: 14, fontWeight: 'bold' },
});
