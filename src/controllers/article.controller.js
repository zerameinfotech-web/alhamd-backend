const ArticleModel = require("../models/article.model");
const ResponseUtils = require("../utils/response.utils");
const AttachmentService = require("../services/attachment.service");

const ENTITY_TYPE_ARTICLE = "articleImage";

const getArticleWithImage = async (id) => {
    const article = await ArticleModel.getById(id);
    if (!article) return null;
    const attachments = await AttachmentService.getAttachments(id, ENTITY_TYPE_ARTICLE);
    if (typeof article.itemGroup === 'string') { try { article.itemGroup = JSON.parse(article.itemGroup); } catch(e) { article.itemGroup = []; } }
    else if (!article.itemGroup) article.itemGroup = [];
    return {
        ...article,
        articleImage: attachments.map(a => ({
            uid: String(a.id),
            name: a.fileName,
            status: 'done',
            url: a.url
        })),
        image: attachments[0]?.url || null
    };
};

exports.create = async (req, res) => {
    try {
        const { articleImage, exchangeRateRange, ...coreData } = req.body;
        delete coreData.articleImage;
        delete coreData.exchangeRateRange;
        if (Array.isArray(coreData.colours)) coreData.colours = JSON.stringify(coreData.colours);
        if (Array.isArray(coreData.itemGroup)) coreData.itemGroup = JSON.stringify(coreData.itemGroup);

        const id = await ArticleModel.create(coreData);
        if (articleImage && articleImage.length > 0) {
            await AttachmentService.handleMultipleAttachments(articleImage, id, ENTITY_TYPE_ARTICLE);
        }
        const newRecord = await getArticleWithImage(id);
        ResponseUtils.success(res, "Article created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, articleImage, exchangeRateRange, ...coreData } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        delete coreData.articleImage;
        delete coreData.exchangeRateRange;
        if (Array.isArray(coreData.colours)) coreData.colours = JSON.stringify(coreData.colours);
        if (Array.isArray(coreData.itemGroup)) coreData.itemGroup = JSON.stringify(coreData.itemGroup);

        await ArticleModel.update(id, coreData);
        if (articleImage) {
            await AttachmentService.handleMultipleAttachments(articleImage, id, ENTITY_TYPE_ARTICLE);
        }
        const updatedRecord = await getArticleWithImage(id);
        ResponseUtils.success(res, "Article updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await ArticleModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        
        const mappedList = await Promise.all(result.list.map(async (a) => {
            const attachments = await AttachmentService.getAttachments(a.id, ENTITY_TYPE_ARTICLE);
            if (typeof a.colours === 'string') { try { a.colours = JSON.parse(a.colours); } catch(e) { a.colours = []; } }
            else if (!a.colours) a.colours = [];
            if (typeof a.itemGroup === 'string') { try { a.itemGroup = JSON.parse(a.itemGroup); } catch(e) { a.itemGroup = []; } }
            else if (!a.itemGroup) a.itemGroup = [];
            return {
                ...a,
                image: attachments[0]?.url || null,
                articleImage: attachments.map(att => ({
                    uid: String(att.id),
                    name: att.fileName,
                    status: 'done',
                    url: att.url
                }))
            };
        }));

        return res.status(200).json({
            success: true,
            message: "Article fetched successfully",
            timestamp: new Date().toISOString(),
            list: mappedList,
            totalCount: result.totalCount
        });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        const data = await getArticleWithImage(id || req.params.id);
        if (!data) return ResponseUtils.error(res, "Article not found", 404);
        ResponseUtils.success(res, "Article fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await ArticleModel.softDelete(id);
        ResponseUtils.success(res, "Article deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await ArticleModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
