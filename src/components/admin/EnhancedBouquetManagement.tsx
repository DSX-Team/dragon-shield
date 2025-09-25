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

        {/* Content Items */}
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <div className="space-y-2 p-4">
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
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleContentToggle(item.id, contentType, checked as boolean)}
                  />
                  
                  {(item.logo_url || item.poster_url) && (
                    <img 
                      src={item.logo_url || item.poster_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="font-medium">{displayName}</div>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Enhanced Bouquet Management
            </CardTitle>
            <CardDescription>Create and manage content bouquets with channels, movies, series, and radio</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Create Bouquet
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bouquets.map((bouquet) => {
                const counts = getContentCounts(bouquet);
                const totalContent = getTotalContent(bouquet);
                
                return (
                  <TableRow key={bouquet.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{bouquet.name}</div>
                        {bouquet.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {bouquet.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {counts.channels > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Tv className="w-3 h-3 mr-1" />
                            {counts.channels} Ch
                          </Badge>
                        )}
                        {counts.movies > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Film className="w-3 h-3 mr-1" />
                            {counts.movies} Movies
                          </Badge>
                        )}
                        {counts.series > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <MonitorPlay className="w-3 h-3 mr-1" />
                            {counts.series} Series
                          </Badge>
                        )}
                        {counts.radio > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Radio className="w-3 h-3 mr-1" />
                            {counts.radio} Radio
                          </Badge>
                        )}
                        {totalContent === 0 && (
                          <span className="text-sm text-muted-foreground">Empty</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={bouquet.is_adult ? "destructive" : "secondary"}>
                        {bouquet.is_adult ? "Adult" : "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{bouquet.sort_order}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(bouquet)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicate(bouquet)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(bouquet.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingBouquet ? "Edit Bouquet" : "Create New Bouquet"}
            </DialogTitle>
            <DialogDescription>
              {editingBouquet ? "Update bouquet information and content" : "Create a new content bouquet"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="movies">Movies</TabsTrigger>
              <TabsTrigger value="series">Series</TabsTrigger>
              <TabsTrigger value="radio">Radio</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bouquet Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Premium Package"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    placeholder="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this bouquet..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_adult"
                  checked={formData.is_adult}
                  onCheckedChange={(checked) => setFormData({...formData, is_adult: checked as boolean})}
                />
                <Label htmlFor="is_adult">Adult Content</Label>
              </div>
              
              {/* Content Summary */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Content Summary</Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{formData.channel_ids.length}</div>
                    <div className="text-xs text-muted-foreground">Channels</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{formData.movie_ids.length}</div>
                    <div className="text-xs text-muted-foreground">Movies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{formData.series_ids.length}</div>
                    <div className="text-xs text-muted-foreground">Series</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{formData.radio_ids.length}</div>
                    <div className="text-xs text-muted-foreground">Radio</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="channels" className="overflow-y-auto max-h-[60vh]">
              {renderContentTab('channels')}
            </TabsContent>
            
            <TabsContent value="movies" className="overflow-y-auto max-h-[60vh]">
              {renderContentTab('movies')}
            </TabsContent>
            
            <TabsContent value="series" className="overflow-y-auto max-h-[60vh]">
              {renderContentTab('series')}
            </TabsContent>
            
            <TabsContent value="radio" className="overflow-y-auto max-h-[60vh]">
              {renderContentTab('radio')}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {editingBouquet ? "Update" : "Create"} Bouquet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};