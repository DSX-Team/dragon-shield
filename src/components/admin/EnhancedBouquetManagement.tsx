import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  Tv, 
  Film, 
  Radio, 
  MonitorPlay,
  Copy,
  Search,
  Filter,
  Eye,
  Star,
  Calendar,
  Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EnhancedBouquet {
  id: string;
  name: string;
  description: string;
  channel_ids: string[];
  movie_ids: string[];
  series_ids: string[];
  radio_ids: string[];
  is_adult: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  active: boolean;
  logo_url?: string;
}

interface Movie {
  id: string;
  name: string;
  category: string;
  genre: string;
  year: number;
  rating: number;
  active: boolean;
  poster_url?: string;
  duration_minutes?: number;
}

interface Series {
  id: string;
  title: string;
  category: string;
  genre: string;
  year: number;
  seasons: number;
  episodes: number;
  rating: number;
  active: boolean;
  poster_url?: string;
}

interface RadioStation {
  id: string;
  name: string;
  category: string;
  frequency: string;
  country: string;
  language: string;
  active: boolean;
  logo_url?: string;
}

interface ContentFilters {
  channels: { category: string; search: string; };
  movies: { category: string; search: string; genre: string; };
  series: { category: string; search: string; genre: string; };
  radio: { category: string; search: string; country: string; };
}

interface EnhancedBouquetManagementProps {
  onUpdate?: () => void;
}

export const EnhancedBouquetManagement = ({ onUpdate }: EnhancedBouquetManagementProps) => {
  const [bouquets, setBouquets] = useState<EnhancedBouquet[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingBouquet, setEditingBouquet] = useState<EnhancedBouquet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    channel_ids: [] as string[],
    movie_ids: [] as string[],
    series_ids: [] as string[],
    radio_ids: [] as string[],
    is_adult: false,
    sort_order: 0
  });

  const [filters, setFilters] = useState<ContentFilters>({
    channels: { category: "", search: "" },
    movies: { category: "", search: "", genre: "" },
    series: { category: "", search: "", genre: "" },
    radio: { category: "", search: "", country: "" }
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: bouquetsData, error: bouquetsError } = await supabase
        .from("bouquets")
        .select("*")
        .order("sort_order", { ascending: true });

      if (bouquetsError) throw bouquetsError;

      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("id, name, category, active, logo_url")
        .eq("active", true)
        .order("name", { ascending: true });

      if (channelsError) throw channelsError;

      const { data: moviesData, error: moviesError } = await supabase
        .from("movies")
        .select("id, name, category, genre, year, rating, active, poster_url, duration_minutes")
        .eq("active", true)
        .order("name", { ascending: true });

      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("id, title, category, genre, year, seasons, episodes, rating, active, poster_url")
        .eq("active", true)
        .order("title", { ascending: true });

      const { data: radioData, error: radioError } = await supabase
        .from("radio_stations")
        .select("id, name, category, frequency, country, language, active, logo_url")
        .eq("active", true)
        .order("name", { ascending: true });

      setBouquets(bouquetsData || []);
      setChannels(channelsData || []);
      setMovies(moviesData || []);
      setSeries(seriesData || []);
      setRadioStations(radioData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load bouquet data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a bouquet name",
        variant: "destructive"
      });
      return;
    }

    try {
      const bouquetData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        channel_ids: formData.channel_ids,
        movie_ids: formData.movie_ids,
        series_ids: formData.series_ids,
        radio_ids: formData.radio_ids,
        is_adult: formData.is_adult,
        sort_order: formData.sort_order
      };

      if (editingBouquet) {
        const { error } = await supabase
          .from("bouquets")
          .update(bouquetData)
          .eq("id", editingBouquet.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bouquet updated successfully"
        });
      } else {
        const { error } = await supabase
          .from("bouquets")
          .insert([bouquetData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bouquet created successfully"
        });
      }

      setShowDialog(false);
      setEditingBouquet(null);
      resetForm();
      fetchAllData();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save bouquet",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      channel_ids: [],
      movie_ids: [],
      series_ids: [],
      radio_ids: [],
      is_adult: false,
      sort_order: bouquets.length
    });
    setActiveTab("details");
  };

  const handleEdit = (bouquet: EnhancedBouquet) => {
    setEditingBouquet(bouquet);
    setFormData({
      name: bouquet.name,
      description: bouquet.description || "",
      channel_ids: bouquet.channel_ids || [],
      movie_ids: bouquet.movie_ids || [],
      series_ids: bouquet.series_ids || [],
      radio_ids: bouquet.radio_ids || [],
      is_adult: bouquet.is_adult || false,
      sort_order: bouquet.sort_order || 0
    });
    setShowDialog(true);
  };

  const handleDuplicate = (bouquet: EnhancedBouquet) => {
    setEditingBouquet(null);
    setFormData({
      name: `${bouquet.name} - Copy`,
      description: bouquet.description || "",
      channel_ids: bouquet.channel_ids || [],
      movie_ids: bouquet.movie_ids || [],
      series_ids: bouquet.series_ids || [],
      radio_ids: bouquet.radio_ids || [],
      is_adult: bouquet.is_adult || false,
      sort_order: bouquets.length
    });
    setShowDialog(true);
  };

  const handleDelete = async (bouquetId: string) => {
    if (!confirm("Are you sure you want to delete this bouquet?")) return;

    try {
      const { error } = await supabase
        .from("bouquets")
        .delete()
        .eq("id", bouquetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bouquet deleted successfully"
      });
      fetchAllData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bouquet",
        variant: "destructive"
      });
    }
  };

  const handleContentToggle = (contentId: string, contentType: 'channels' | 'movies' | 'series' | 'radio', checked: boolean) => {
    const fieldName = contentType === 'channels' ? 'channel_ids' : 
                      contentType === 'movies' ? 'movie_ids' :
                      contentType === 'series' ? 'series_ids' : 'radio_ids';

    if (checked) {
      setFormData({
        ...formData,
        [fieldName]: [...formData[fieldName], contentId]
      });
    } else {
      setFormData({
        ...formData,
        [fieldName]: formData[fieldName].filter(id => id !== contentId)
      });
    }
  };

  const openAddDialog = () => {
    setEditingBouquet(null);
    resetForm();
    setShowDialog(true);
  };

  const getContentCounts = (bouquet: EnhancedBouquet) => {
    return {
      channels: bouquet.channel_ids?.length || 0,
      movies: bouquet.movie_ids?.length || 0,
      series: bouquet.series_ids?.length || 0,
      radio: bouquet.radio_ids?.length || 0
    };
  };

  const getTotalContent = (bouquet: EnhancedBouquet) => {
    const counts = getContentCounts(bouquet);
    return counts.channels + counts.movies + counts.series + counts.radio;
  };

  const getFilteredContent = (contentType: 'channels' | 'movies' | 'series' | 'radio') => {
    switch (contentType) {
      case 'channels':
        return channels.filter(item => {
          const categoryMatch = !filters.channels.category || item.category === filters.channels.category;
          const searchMatch = !filters.channels.search || 
            item.name.toLowerCase().includes(filters.channels.search.toLowerCase());
          return categoryMatch && searchMatch;
        });
      case 'movies':
        return movies.filter(item => {
          const categoryMatch = !filters.movies.category || item.category === filters.movies.category;
          const genreMatch = !filters.movies.genre || item.genre === filters.movies.genre;
          const searchMatch = !filters.movies.search || 
            item.name.toLowerCase().includes(filters.movies.search.toLowerCase());
          return categoryMatch && genreMatch && searchMatch;
        });
      case 'series':
        return series.filter(item => {
          const categoryMatch = !filters.series.category || item.category === filters.series.category;
          const genreMatch = !filters.series.genre || item.genre === filters.series.genre;
          const searchMatch = !filters.series.search || 
            item.title.toLowerCase().includes(filters.series.search.toLowerCase());
          return categoryMatch && genreMatch && searchMatch;
        });
      case 'radio':
        return radioStations.filter(item => {
          const categoryMatch = !filters.radio.category || item.category === filters.radio.category;
          const countryMatch = !filters.radio.country || item.country === filters.radio.country;
          const searchMatch = !filters.radio.search || 
            item.name.toLowerCase().includes(filters.radio.search.toLowerCase());
          return categoryMatch && countryMatch && searchMatch;
        });
      default:
        return [];
    }
  };

  const getUniqueCategories = (contentType: 'channels' | 'movies' | 'series' | 'radio') => {
    switch (contentType) {
      case 'channels':
        return [...new Set(channels.map(c => c.category).filter(Boolean))];
      case 'movies':
        return [...new Set(movies.map(m => m.category).filter(Boolean))];
      case 'series':
        return [...new Set(series.map(s => s.category).filter(Boolean))];
      case 'radio':
        return [...new Set(radioStations.map(r => r.category).filter(Boolean))];
      default:
        return [];
    }
  };

  const getUniqueGenres = () => {
    const movieGenres = movies.map(m => m.genre).filter(Boolean);
    const seriesGenres = series.map(s => s.genre).filter(Boolean);
    return [...new Set([...movieGenres, ...seriesGenres])];
  };

  const getUniqueCountries = () => {
    return [...new Set(radioStations.map(r => r.country).filter(Boolean))];
  };

  const renderContentTab = (contentType: 'channels' | 'movies' | 'series' | 'radio') => {
    const filteredContent = getFilteredContent(contentType);
    const selectedIds = contentType === 'channels' ? formData.channel_ids :
                       contentType === 'movies' ? formData.movie_ids :
                       contentType === 'series' ? formData.series_ids : formData.radio_ids;

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={filters[contentType].category} 
              onValueChange={(value) => setFilters(prev => ({
                ...prev,
                [contentType]: { ...prev[contentType], category: value }
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {getUniqueCategories(contentType).map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(contentType === 'movies' || contentType === 'series') && (
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select 
                value={filters[contentType].genre} 
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  [contentType]: { ...prev[contentType], genre: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Genres</SelectItem>
                  {getUniqueGenres().map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {contentType === 'radio' && (
            <div className="space-y-2">
              <Label>Country</Label>
              <Select 
                value={filters.radio.country} 
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  radio: { ...prev.radio, country: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  {getUniqueCountries().map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${contentType}...`}
                value={filters[contentType].search}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  [contentType]: { ...prev[contentType], search: e.target.value }
                }))}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-2 p-2 border rounded-lg bg-background">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Add all filtered items to bouquet
              const itemIds = filteredContent.map(item => item.id);
              const fieldName = contentType === 'channels' ? 'channel_ids' : 
                               contentType === 'movies' ? 'movie_ids' :
                               contentType === 'series' ? 'series_ids' : 'radio_ids';
              
              const newIds = [...new Set([...formData[fieldName], ...itemIds])];
              setFormData({ ...formData, [fieldName]: newIds });
            }}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add All ({filteredContent.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Remove all filtered items from bouquet
              const itemIds = filteredContent.map(item => item.id);
              const fieldName = contentType === 'channels' ? 'channel_ids' : 
                               contentType === 'movies' ? 'movie_ids' :
                               contentType === 'series' ? 'series_ids' : 'radio_ids';
              
              const newIds = formData[fieldName].filter(id => !itemIds.includes(id));
              setFormData({ ...formData, [fieldName]: newIds });
            }}
          >
            <Filter className="w-3 h-3 mr-1" />
            Remove All
          </Button>
          <div className="ml-auto text-sm text-muted-foreground flex items-center">
            {selectedIds.length} / {filteredContent.length} selected
          </div>
        </div>

        {/* Content Grid */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <div className="grid gap-2 p-4">
            {filteredContent.map((item: any) => {
              const isSelected = selectedIds.includes(item.id);
              const displayName = contentType === 'series' ? item.title : item.name;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleContentToggle(item.id, contentType, e.target.checked)}
                    className="rounded"
                  />
                  
                  {(item.logo_url || item.poster_url) && (
                    <img 
                      src={item.logo_url || item.poster_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover bg-muted"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{displayName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                      {contentType === 'movies' && item.year && (
                        <span className="text-xs">({item.year})</span>
                      )}
                      {contentType === 'series' && (
                        <span className="text-xs">
                          {item.seasons}S / {item.episodes}E
                        </span>
                      )}
                      {contentType === 'radio' && item.frequency && (
                        <span className="text-xs">{item.frequency}</span>
                      )}
                    </div>
                  </div>
                  
                  {(item.rating || item.genre) && (
                    <div className="text-right text-sm">
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{item.rating}</span>
                        </div>
                      )}
                      {item.genre && (
                        <div className="text-xs text-muted-foreground">{item.genre}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredContent.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No {contentType} found matching current filters
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search ${contentType}...`}
                className="pl-10"
                value={filters[contentType].search}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  [contentType]: { ...prev[contentType], search: e.target.value }
                }))}
              />
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Select {contentType === 'channels' ? 'Channels' : 
                          contentType === 'movies' ? 'Movies' :
                          contentType === 'series' ? 'Series' : 'Radio Stations'} 
              ({selectedIds.length} selected)
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = filteredContent.map(item => item.id);
                const allSelected = allIds.every(id => selectedIds.includes(id));
                
                if (allSelected) {
                  // Deselect all visible
                  setFormData(prev => ({
                    ...prev,
                    [contentType === 'channels' ? 'channel_ids' : 
                     contentType === 'movies' ? 'movie_ids' :
                     contentType === 'series' ? 'series_ids' : 'radio_ids']: 
                     selectedIds.filter(id => !allIds.includes(id))
                  }));
                } else {
                  // Select all visible
                  const newIds = [...new Set([...selectedIds, ...allIds])];
                  setFormData(prev => ({
                    ...prev,
                    [contentType === 'channels' ? 'channel_ids' : 
                     contentType === 'movies' ? 'movie_ids' :
                     contentType === 'series' ? 'series_ids' : 'radio_ids']: newIds
                  }));
                }
              }}
            >
              Toggle Page
            </Button>
          </div>
          
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {filteredContent.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 border-b hover:bg-muted/50">
                <Checkbox
                  id={`${contentType}-${item.id}`}
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={(checked) => handleContentToggle(item.id, contentType, !!checked)}
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {contentType === 'series' ? (item as Series).title : 
                       contentType === 'channels' ? (item as Channel).name :
                       contentType === 'movies' ? (item as Movie).name :
                       (item as RadioStation).name}
                    </span>
                    
                    {(item as any).category && (
                      <Badge variant="outline" className="text-xs">
                        {(item as any).category}
                      </Badge>
                    )}
                    
                    {contentType === 'movies' && (item as Movie).rating && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        {(item as Movie).rating}
                      </Badge>
                    )}
                    
                    {contentType === 'series' && (
                      <Badge variant="secondary" className="text-xs">
                        S{(item as Series).seasons} E{(item as Series).episodes}
                      </Badge>
                    )}
                    
                    {contentType === 'radio' && (item as RadioStation).frequency && (
                      <Badge variant="secondary" className="text-xs">
                        {(item as RadioStation).frequency}
                      </Badge>
                    )}
                    
                    {(contentType === 'movies' || contentType === 'series') && (item as Movie | Series).year && (
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {(item as Movie | Series).year}
                      </Badge>
                    )}
                    
                    {contentType === 'radio' && (item as RadioStation).country && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        {(item as RadioStation).country}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredContent.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No {contentType} found matching your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in-scale">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-xtream-blue to-xtream-navy bg-clip-text text-transparent">
              <Package className="h-5 w-5 text-xtream-blue" />
              Enhanced Bouquet Management
            </CardTitle>
            <CardDescription>Manage comprehensive content bouquets with channels, movies, series and radio</CardDescription>
          </div>
          <Button onClick={openAddDialog} className="bg-gradient-to-r from-xtream-blue to-xtream-navy hover:from-xtream-blue-light hover:to-xtream-navy shadow-lg hover:shadow-xl transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Add Bouquet
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Content Types</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Total Items</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bouquets.map((bouquet) => {
                const counts = getContentCounts(bouquet);
                const total = getTotalContent(bouquet);
                return (
                  <TableRow key={bouquet.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{bouquet.sort_order}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{bouquet.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {bouquet.description || <span className="text-muted-foreground italic">No description</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {counts.channels > 0 && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            <Tv className="w-3 h-3 mr-1" />
                            {counts.channels}
                          </Badge>
                        )}
                        {counts.movies > 0 && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                            <Film className="w-3 h-3 mr-1" />
                            {counts.movies}
                          </Badge>
                        )}
                        {counts.series > 0 && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            <MonitorPlay className="w-3 h-3 mr-1" />
                            {counts.series}
                          </Badge>
                        )}
                        {counts.radio > 0 && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            <Radio className="w-3 h-3 mr-1" />
                            {counts.radio}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {bouquet.is_adult ? (
                        <Badge variant="destructive">Adult</Badge>
                      ) : (
                        <Badge variant="secondary">General</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-gradient-to-r from-xtream-blue to-xtream-navy text-white font-bold">
                        {total}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(bouquet.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(bouquet)}
                          title="Edit bouquet"
                          className="hover:bg-xtream-blue hover:text-white transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(bouquet)}
                          title="Duplicate bouquet"
                          className="hover:bg-xtream-orange hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(bouquet.id)}
                          title="Delete bouquet"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {bouquets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p>No bouquets found.</p>
                    <p className="text-sm">Create your first comprehensive bouquet to get started.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingBouquet ? <Pencil className="h-5 w-5 text-xtream-blue" /> : <Plus className="h-5 w-5 text-xtream-blue" />}
              <span className="bg-gradient-to-r from-xtream-blue to-xtream-navy bg-clip-text text-transparent">
                {editingBouquet ? "Edit Bouquet" : "Create New Bouquet"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {editingBouquet ? "Update bouquet information and content selection" : "Create a comprehensive content bouquet with channels, movies, series and radio"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-6 bg-muted/50">
              <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="channels" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white">
                <Tv className="w-4 h-4" />
                Channels ({formData.channel_ids.length})
              </TabsTrigger>
              <TabsTrigger value="movies" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white">
                <Film className="w-4 h-4" />
                Movies ({formData.movie_ids.length})
              </TabsTrigger>
              <TabsTrigger value="series" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white">
                <MonitorPlay className="w-4 h-4" />
                Series ({formData.series_ids.length})
              </TabsTrigger>
              <TabsTrigger value="radio" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-blue data-[state=active]:to-xtream-navy data-[state=active]:text-white">
                <Radio className="w-4 h-4" />
                Radio ({formData.radio_ids.length})
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-xtream-orange data-[state=active]:to-accent data-[state=active]:text-white">
                <Eye className="w-4 h-4" />
                Review
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Bouquet Name *</Label>
                  <Input
                    id="name"
                    placeholder="Premium Sports & Entertainment Package"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sort-order">Sort Order</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                    className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Comprehensive package including live TV channels, premium movies, popular series and radio stations..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background/70 transition-all duration-300 min-h-20"
                />
              </div>

              <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <Checkbox
                  id="is-adult"
                  checked={formData.is_adult}
                  onCheckedChange={(checked) => setFormData({...formData, is_adult: !!checked})}
                />
                <Label htmlFor="is-adult" className="text-sm font-medium">
                  Adult Content Bouquet
                  <span className="block text-xs text-muted-foreground">
                    Mark this bouquet as containing adult or mature content
                  </span>
                </Label>
              </div>
            </TabsContent>

            <TabsContent value="channels" className="p-6">
              {renderContentTab('channels')}
            </TabsContent>

            <TabsContent value="movies" className="p-6">
              {renderContentTab('movies')}
            </TabsContent>

            <TabsContent value="series" className="p-6">
              {renderContentTab('series')}
            </TabsContent>

            <TabsContent value="radio" className="p-6">
              {renderContentTab('radio')}
            </TabsContent>

            <TabsContent value="review" className="p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Bouquet Review</h3>
                <p className="text-muted-foreground">Review all selected content for your bouquet</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Tv className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Live Channels ({formData.channel_ids.length})</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      {formData.channel_ids.length === 0 ? "No channels selected" : 
                       `${formData.channel_ids.length} live TV channels selected`}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Film className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-purple-900">Movies ({formData.movie_ids.length})</span>
                    </div>
                    <div className="text-sm text-purple-700">
                      {formData.movie_ids.length === 0 ? "No movies selected" : 
                       `${formData.movie_ids.length} movies selected`}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <MonitorPlay className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-900">TV Series ({formData.series_ids.length})</span>
                    </div>
                    <div className="text-sm text-green-700">
                      {formData.series_ids.length === 0 ? "No series selected" : 
                       `${formData.series_ids.length} TV series selected`}
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Radio className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-orange-900">Radio Stations ({formData.radio_ids.length})</span>
                    </div>
                    <div className="text-sm text-orange-700">
                      {formData.radio_ids.length === 0 ? "No radio stations selected" : 
                       `${formData.radio_ids.length} radio stations selected`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-xtream-blue/10 to-xtream-navy/10 rounded-lg border border-xtream-blue/20 text-center">
                <div className="text-2xl font-bold text-xtream-navy mb-2">
                  Total Content: {formData.channel_ids.length + formData.movie_ids.length + formData.series_ids.length + formData.radio_ids.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  This comprehensive bouquet will provide users with access to all selected content across multiple categories.
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-3 mt-6 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowDialog(false)}
              className="hover:bg-muted/80 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name.trim()}
              className="bg-gradient-to-r from-xtream-blue to-xtream-navy hover:from-xtream-blue-light hover:to-xtream-navy text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingBouquet ? "Update" : "Create"} Bouquet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};