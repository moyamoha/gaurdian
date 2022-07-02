import router from "@/router";
import axios from "axios";
import jwt_decode from "jwt-decode";

const state = {
	user: { email: "ijfksdj" },
	authError: "",
};

const getters = {
	loggedInUser: (state) => state.user,
	authError: (state) => state.authError,
};

const actions = {
	login: async ({ commit }, { email, password }) => {
		try {
			const resp = await axios.post("/auth/login", {
				email: email,
				password: password,
			});
			if (resp.data.accessToken) {
				localStorage.setItem("accessToken", resp.data.accessToken);
				const decoded = jwt_decode(resp.data.accessToken);
				commit("setUser", {
					email: decoded.email,
					firstname: decoded.firstname,
					lastname: decoded.lastname,
					mfaEnabled: decoded.mfaEnabled,
				});
				router.push("/home");
			} else {
				router.push("/verify-code");
			}
		} catch (error) {}
	},
	logout: ({ commit }) => {
		localStorage.removeItem("accessToken");
		commit("setUser", null);
		router.push("/").catch((e) => {});
	},

	verifyCode: async ({ commit }, code) => {
		try {
			const resp = await axios.post("/auth/verify-code", { code: code });
			localStorage.setItem("accessToken", resp.data.accessToken);
			const decoded = jwt_decode(resp.data.accessToken);
			commit("setUser", {
				email: decoded.email,
				firstname: decoded.firstname,
				lastname: decoded.lastname,
				mfaEnabled: decoded.mfaEnabled,
			});
			router.push("/home");
		} catch (e) {
			// commit("setAuthError", e);
		}
	},
};

const mutations = {
	setAuthError: (state, errorMsg) => (state.authError = errorMsg),
	setUser: (state, userObj) => (state.user = userObj),
};

export default {
	state,
	actions,
	mutations,
	getters,
};
