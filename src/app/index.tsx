import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ImageBackground,
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
	const [login, setLogin] = useState('');
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

				if (emailSalvo) setLogin(emailSalvo);

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
		if (!login.trim() || !senha) {
			setErro('Informe o usuário ou email e a senha.');
			return;
		}

		setErro('');
		setLoading(true);

		try {
			const response = await axios.post<LoginResponse>(API_URL, {
				email: login.trim(),
				senha,
			});

			const token = response.data.token ?? response.data.accessToken;

			if (!token) {
				setErro('A API autenticou, mas não retornou um token JWT.');
				return;
			}

			await SecureStore.setItemAsync(TOKEN_KEY, token);
			await SecureStore.setItemAsync(EMAIL_KEY, login.trim());
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
		<ImageBackground
			resizeMode="cover"
			source={{ uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' }}
			style={styles.background}>
			<View style={styles.overlay} />
			<SafeAreaView style={styles.container}>
				<View style={styles.form}>
					<Text style={styles.title}>SIMAPRIND</Text>
					<Text style={styles.subtitle}>Acesse o monitoramento industrial</Text>

					<Text style={styles.label}>Usuário ou E-mail</Text>
					<TextInput
						style={styles.input}
						placeholder="Digite seu usuário ou e-mail"
						autoCapitalize="none"
						autoCorrect={false}
						value={login}
						onChangeText={setLogin}
					/>

					<Text style={styles.label}>Senha</Text>
					<View style={styles.passwordContainer}>
						<TextInput
							style={styles.passwordInput}
							placeholder="Digite sua senha"
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
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	background: { flex: 1 },
	overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0, 0, 0, 0.58)' },
	container: { flex: 1, justifyContent: 'center', padding: 24 },
	form: {
		alignSelf: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.92)',
		borderRadius: 18,
		maxWidth: 420,
		padding: 28,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 16,
		width: '100%',
		elevation: 8,
	},
	title: { color: '#1f2937', fontSize: 30, fontWeight: 'bold', textAlign: 'center' },
	subtitle: { color: '#4b5563', marginBottom: 24, marginTop: 8, textAlign: 'center' },
	label: { color: '#374151', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
	input: {
		backgroundColor: '#fff',
		borderColor: '#d1d5db',
		borderRadius: 8,
		borderWidth: 1,
		fontSize: 16,
		marginBottom: 14,
		padding: 14,
	},
	passwordContainer: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderColor: '#d1d5db',
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
