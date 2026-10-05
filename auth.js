// =========================================================
// NOVA AUTHENTICATION SYSTEM
// =========================================================

let novaSupabase = null;
let currentNovaUser = null;


// ELEMENTS

const loginButton = document.getElementById("loginButton");
const authOverlay = document.getElementById("authOverlay");
const authCloseButton = document.getElementById("authCloseButton");

const signInView = document.getElementById("signInView");
const createAccountView = document.getElementById("createAccountView");
const accountView = document.getElementById("accountView");
const resetPasswordView = document.getElementById("resetPasswordView");

const signInForm = document.getElementById("signInForm");
const createAccountForm = document.getElementById("createAccountForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");

const signInEmail = document.getElementById("signInEmail");
const signInPassword = document.getElementById("signInPassword");

const createName = document.getElementById("createName");
const createEmail = document.getElementById("createEmail");
const createPassword = document.getElementById("createPassword");

const resetEmail = document.getElementById("resetEmail");

const showCreateAccountButton =
    document.getElementById("showCreateAccountButton");

const backToSignInButton =
    document.getElementById("backToSignInButton");

const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

const resetBackButton =
    document.getElementById("resetBackButton");

const signOutButton =
    document.getElementById("signOutButton");

const closeAccountButton =
    document.getElementById("closeAccountButton");

const signInSubmitButton =
    document.getElementById("signInSubmitButton");

const createAccountSubmitButton =
    document.getElementById("createAccountSubmitButton");

const resetPasswordSubmitButton =
    document.getElementById("resetPasswordSubmitButton");

const signInMessage =
    document.getElementById("signInMessage");

const createAccountMessage =
    document.getElementById("createAccountMessage");

const resetPasswordMessage =
    document.getElementById("resetPasswordMessage");

const accountMessage =
    document.getElementById("accountMessage");

const accountName =
    document.getElementById("accountName");

const accountEmail =
    document.getElementById("accountEmail");


// INITIALIZE SUPABASE

async function initializeNovaAuth() {
    try {
        const response = await fetch("/api/config");

        if (!response.ok) {
            throw new Error(
                "Could not load NOVA authentication configuration."
            );
        }

        const config = await response.json();

        if (!config.supabaseUrl || !config.supabasePublishableKey) {
            throw new Error(
                "Supabase configuration is incomplete."
            );
        }

        if (!window.supabase) {
            throw new Error(
                "Supabase library failed to load."
            );
        }

        novaSupabase = window.supabase.createClient(
            config.supabaseUrl,
            config.supabasePublishableKey
        );

        const { data, error } =
            await novaSupabase.auth.getSession();

        if (error) {
            console.error(
                "NOVA session check error:",
                error
            );
        }

        if (data?.session?.user) {
            setLoggedInUser(data.session.user);
        } else {
            setLoggedOutUser();
        }

        novaSupabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    setLoggedInUser(session.user);
                } else {
                    setLoggedOutUser();
                }
            }
        );

        console.log("NOVA authentication ready.");

    } catch (error) {
        console.error("NOVA AUTH ERROR:", error);

        if (loginButton) {
            loginButton.textContent = "Account Error";
        }
    }
}


// MODAL

function openAuthModal() {
    authOverlay.classList.add("active");

    authOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";

    if (currentNovaUser) {
        showView(accountView);
        updateAccountView(currentNovaUser);
    } else {
        showView(signInView);
    }
}


function closeAuthModal() {
    authOverlay.classList.remove("active");

    authOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";
}


function showView(viewToShow) {
    const views = [
        signInView,
        createAccountView,
        accountView,
        resetPasswordView
    ];

    views.forEach((view) => {
        view.hidden = view !== viewToShow;
    });

    clearMessages();
}


function clearMessages() {
    const messages = [
        signInMessage,
        createAccountMessage,
        resetPasswordMessage,
        accountMessage
    ];

    messages.forEach((message) => {
        message.textContent = "";

        message.classList.remove(
            "success",
            "error"
        );
    });
}


function showMessage(element, message, type = "") {
    element.textContent = message;

    element.classList.remove(
        "success",
        "error"
    );

    if (type) {
        element.classList.add(type);
    }
}


// USER STATE

function setLoggedInUser(user) {
    currentNovaUser = user;

    const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Account";

    loginButton.textContent = name;

    loginButton.classList.add(
        "user-connected"
    );

    updateAccountView(user);
}


function setLoggedOutUser() {
    currentNovaUser = null;

    loginButton.textContent = "Sign In";

    loginButton.classList.remove(
        "user-connected"
    );
}


function updateAccountView(user) {
    const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "NOVA User";

    accountName.textContent = name;
    accountEmail.textContent = user.email || "";
}


// SIGN IN

signInForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        if (!novaSupabase) {
            showMessage(
                signInMessage,
                "NOVA account service is not ready.",
                "error"
            );

            return;
        }

        const email = signInEmail.value.trim();
        const password = signInPassword.value;

        signInSubmitButton.disabled = true;
        signInSubmitButton.textContent = "Signing In...";

        showMessage(
            signInMessage,
            "Connecting to NOVA..."
        );

        try {
            const { data, error } =
                await novaSupabase.auth
                    .signInWithPassword({
                        email,
                        password
                    });

            if (error) {
                throw error;
            }

            if (data?.user) {
                setLoggedInUser(data.user);

                showView(accountView);

                showMessage(
                    accountMessage,
                    "Signed in successfully.",
                    "success"
                );

                signInForm.reset();
            }

        } catch (error) {
            console.error(
                "NOVA SIGN IN ERROR:",
                error
            );

            showMessage(
                signInMessage,
                error.message || "Unable to sign in.",
                "error"
            );

        } finally {
            signInSubmitButton.disabled = false;
            signInSubmitButton.textContent = "Sign In";
        }
    }
);


// CREATE ACCOUNT

createAccountForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        if (!novaSupabase) {
            showMessage(
                createAccountMessage,
                "NOVA account service is not ready.",
                "error"
            );

            return;
        }

        const name = createName.value.trim();
        const email = createEmail.value.trim();
        const password = createPassword.value;

        createAccountSubmitButton.disabled = true;

        createAccountSubmitButton.textContent =
            "Creating Account...";

        showMessage(
            createAccountMessage,
            "Creating your NOVA account..."
        );

        try {
            const { data, error } =
                await novaSupabase.auth.signUp({
                    email,
                    password,

                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

            if (error) {
                throw error;
            }

            createAccountForm.reset();

            if (data?.user && !data?.session) {
                showMessage(
                    createAccountMessage,
                    "Account created. Check your email and confirm your account, then sign in.",
                    "success"
                );

                return;
            }

            if (data?.session?.user) {
                setLoggedInUser(data.session.user);

                showView(accountView);

                showMessage(
                    accountMessage,
                    "Your NOVA account is ready.",
                    "success"
                );
            }

        } catch (error) {
            console.error(
                "NOVA SIGN UP ERROR:",
                error
            );

            showMessage(
                createAccountMessage,
                error.message ||
                    "Unable to create account.",
                "error"
            );

        } finally {
            createAccountSubmitButton.disabled = false;

            createAccountSubmitButton.textContent =
                "Create Account";
        }
    }
);


// PASSWORD RESET

resetPasswordForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        if (!novaSupabase) {
            showMessage(
                resetPasswordMessage,
                "NOVA account service is not ready.",
                "error"
            );

            return;
        }

        const email = resetEmail.value.trim();

        resetPasswordSubmitButton.disabled = true;
        resetPasswordSubmitButton.textContent = "Sending...";

        try {
            const { error } =
                await novaSupabase.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                window.location.origin
                        }
                    );

            if (error) {
                throw error;
            }

            showMessage(
                resetPasswordMessage,
                "Password reset email sent. Check your inbox.",
                "success"
            );

        } catch (error) {
            console.error(
                "NOVA RESET ERROR:",
                error
            );

            showMessage(
                resetPasswordMessage,
                error.message ||
                    "Unable to send reset email.",
                "error"
            );

        } finally {
            resetPasswordSubmitButton.disabled = false;

            resetPasswordSubmitButton.textContent =
                "Send Reset Link";
        }
    }
);


// SIGN OUT

signOutButton.addEventListener(
    "click",
    async () => {
        if (!novaSupabase) {
            return;
        }

        signOutButton.disabled = true;
        signOutButton.textContent = "Signing Out...";

        try {
            const { error } =
                await novaSupabase.auth.signOut();

            if (error) {
                throw error;
            }

            setLoggedOutUser();
            showView(signInView);

            showMessage(
                signInMessage,
                "You have been signed out.",
                "success"
            );

        } catch (error) {
            console.error(
                "NOVA SIGN OUT ERROR:",
                error
            );

            showMessage(
                accountMessage,
                error.message || "Unable to sign out.",
                "error"
            );

        } finally {
            signOutButton.disabled = false;
            signOutButton.textContent = "Sign Out";
        }
    }
);


// BUTTON EVENTS

loginButton.addEventListener(
    "click",
    openAuthModal
);

authCloseButton.addEventListener(
    "click",
    closeAuthModal
);

closeAccountButton.addEventListener(
    "click",
    closeAuthModal
);

showCreateAccountButton.addEventListener(
    "click",
    () => {
        showView(createAccountView);
    }
);

backToSignInButton.addEventListener(
    "click",
    () => {
        showView(signInView);
    }
);

forgotPasswordButton.addEventListener(
    "click",
    () => {
        resetEmail.value =
            signInEmail.value.trim();

        showView(resetPasswordView);
    }
);

resetBackButton.addEventListener(
    "click",
    () => {
        showView(signInView);
    }
);


// CLICK OUTSIDE TO CLOSE

authOverlay.addEventListener(
    "click",
    (event) => {
        if (event.target === authOverlay) {
            closeAuthModal();
        }
    }
);


// ESCAPE TO CLOSE

document.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Escape" &&
            authOverlay.classList.contains("active")
        ) {
            closeAuthModal();
        }
    }
);


// START AUTHENTICATION

initializeNovaAuth();