export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response>{
    const response = await fetch(url, options);

    if (response.status == 401){
        window.location.href = '/login';
        return new Promise(() => {});
    }

    return response;
}