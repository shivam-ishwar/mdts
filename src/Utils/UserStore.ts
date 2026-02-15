type Listener = () => void;

class UserStore {
    private listeners: Listener[] = [];

    getUser = () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    };

    setUser = (user: any) => {
        if (user == null) {
            localStorage.removeItem('user');
        } else {
            localStorage.setItem('user', JSON.stringify(user));
        }
        this.notify();
    };

    subscribe = (listener: Listener) => {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    };

    private notify = () => {
        this.listeners.forEach((l) => l());
    };
}

export const userStore = new UserStore();
