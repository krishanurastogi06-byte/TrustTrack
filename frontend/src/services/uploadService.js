import api from "../lib/axios";

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/uploads", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return res.data?.data || res.data || {};
}

export default {
    uploadFile,
};
