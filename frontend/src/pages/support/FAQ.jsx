import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { apiArray, faqAPI } from '../../services/api';
import { useIsKorean } from '../../utils/language';

const ALL = '__all__';

const FAQ = () => {
  const { t } = useTranslation();
  const isKorean = useIsKorean();

  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      setLoading(true);
      try {
        const [faqRes, catRes] = await Promise.allSettled([faqAPI.getAll(), faqAPI.getCategories()]);
        setFaqs(faqRes.status === 'fulfilled' ? apiArray(faqRes.value.data, 'faqs') : []);
        setCategoryList(catRes.status === 'fulfilled' ? apiArray(catRes.value.data, 'categories') : []);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const getQuestion = (faq) => (isKorean ? faq.question_ko || faq.question_en : faq.question_en || faq.question_ko) || faq.question || '';
  const getAnswer = (faq) => (isKorean ? faq.answer_ko || faq.answer_en : faq.answer_en || faq.answer_ko) || faq.answer || '';
  const getCategoryLabel = (faq) => {
    const cat = categoryList.find((c) => String(c.id) === String(faq.category_id));
    if (cat) return (isKorean ? cat.name_ko || cat.name_en : cat.name_en || cat.name_ko) || '';
    return faq.category_name || faq.category || (isKorean ? '기타' : 'Other');
  };

  const categories = [
    { key: ALL, label: isKorean ? '전체' : 'All' },
    ...(categoryList.length > 0
      ? categoryList.map((c) => ({
          key: String(c.id),
          label: (isKorean ? c.name_ko || c.name_en : c.name_en || c.name_ko) || '-',
        }))
      : faqs
          .filter((faq, index, arr) => faq.category_id && arr.findIndex((f) => f.category_id === faq.category_id) === index)
          .map((faq) => ({ key: String(faq.category_id), label: faq.category_name || '-' }))),
  ];

  const term = searchTerm.trim().toLowerCase();
  const filteredFAQs = faqs.filter((faq) => {
    const haystack = [faq.question_ko, faq.question_en, faq.answer_ko, faq.answer_en]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !term || haystack.includes(term);
    const matchesCategory = selectedCategory === ALL || String(faq.category_id) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {t('support.faq')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('support.faqDescription')}
        </Typography>
      </Box>

      <Card>
        <CardContent>
          {/* Search */}
          <TextField
            fullWidth
            placeholder={isKorean ? '질문을 검색해보세요...' : 'Search questions...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Category Filters */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {categories.map((category) => (
              <Chip
                key={category.key}
                label={category.label}
                variant={selectedCategory === category.key ? 'filled' : 'outlined'}
                onClick={() => setSelectedCategory(category.key)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>

          {/* FAQ List */}
          {loading ? (
            <Box>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : filteredFAQs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                {isKorean ? '검색 결과가 없습니다' : 'No results found'}
              </Typography>
            </Box>
          ) : (
            filteredFAQs.map((faq) => (
              <Accordion
                key={faq.id}
                expanded={expanded === faq.id}
                onChange={handleAccordionChange(faq.id)}
                sx={{
                  mb: 1,
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid #E5E5E5',
                  '&.Mui-expanded': {
                    margin: 0,
                    mb: 1,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&.Mui-expanded': {
                      minHeight: 48,
                      borderBottom: '1px solid #E5E5E5',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Chip
                      label={getCategoryLabel(faq)}
                      size="small"
                      variant="outlined"
                      sx={{ minWidth: 60 }}
                    />
                    <Typography variant="body1" fontWeight={500}>
                      Q. {getQuestion(faq)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ backgroundColor: '#F8F9FA' }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    A. {getAnswer(faq)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default FAQ;
