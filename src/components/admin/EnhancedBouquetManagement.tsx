import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  Copy,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  PlaySquare,
  Eye
} from "lucide-react";

interface Bouquet {
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
}

interface Movie {
  id: string;
  name: string;
  category: string;
  year: number;
  genre: string;
  rating: number;
  active: boolean;
}

interface Series {
  id: string;
  title: string;
  category: string;
  year: number;
  genre: string;
  rating: number;
  seasons: number;
  episodes: number;
  active: boolean;
}

interface RadioStation {
  id: string;
  name: string;
  category: string;
  frequency: string;
  country: string;
  active: boolean;
}

interface ContentFilters {
  channels: { category: string; search: string };
  movies: { category: string; search: string };
  series: { category: string; search: string };
  radio: { category: string; search: string };
}

export const EnhancedBouquetManagement = ({ onUpdate }: { onUpdate?: () => void }) => {
  // State management
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingBouquet, setEditingBouquet] = useState<Bouquet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  const [filters, setFilters] = useState<ContentFilters>({
    channels: { category: "", search: "" },
    movies: { category: "", search: "" },
    series: { category: "", search: "" },
    radio: { category: "", search: "" }
  });

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

  const { toast } = useToast();

  // Computed categories for filtering
  const categories = useMemo(() => ({
    channels: [...new Set(channels.map(c => c.category).filter(Boolean))].sort(),
    movies: [...new Set(movies.map(m => m.category).filter(Boolean))].sort(),
    series: [...new Set(series.map(s => s.category).filter(Boolean))].sort(),
    radio: [...new Set(radioStations.map(r => r.category).filter(Boolean))].sort(),
  }), [channels, movies, series, radioStations]);

  // Filtered content based on search and category
  const filteredContent = useMemo(() => {
    const filterContent = (items: any[], filter: { category: string; search: string }, nameField: string) => {
      return items.filter(item => {
        const matchesCategory = !filter.category || item.category === filter.category;
        const matchesSearch = !filter.search || 
          item[nameField].toLowerCase().includes(filter.search.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    };

    return {
      channels: filterContent(channels, filters.channels, 'name'),
      movies: filterContent(movies, filters.movies, 'name'),
      series: filterContent(series, filters.series, 'title'),
      radio: filterContent(radioStations, filters.radio, 'name')
    };
  }, [channels, movies, series, radioStations, filters]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [bouquetsRes, channelsRes, moviesRes, seriesRes, radioRes] = await Promise.all([
        supabase.from("bouquets").select("*").order("sort_order"),
        supabase.from("channels").select("id, name, category, active").eq("active", true).order("name"),
        supabase.from("movies").select("*").eq("active", true).order("name"),
        supabase.from("series").select("*").eq("active", true).order("title"),
        supabase.from("radio_stations").select("*").eq("active", true).order("name")
      ]);

      if (bouquetsRes.error) throw bouquetsRes.error;
      if (channelsRes.error) throw channelsRes.error;
      if (moviesRes.error) throw moviesRes.error;
      if (seriesRes.error) throw seriesRes.error;
      if (radioRes.error) throw radioRes.error;

      setBouquets(bouquetsRes.data || []);
      setChannels(channelsRes.data || []);
      setMovies(moviesRes.data || []);
      setSeries(seriesRes.data || []);
      setRadioStations(radioRes.data || []);
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
    setEditingBouquet(null);
  };

  const handleEdit = (bouquet: Bouquet) => {
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

  const handleDuplicate = (bouquet: Bouquet) => {
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

  const handleContentToggle = (contentType: 'channel_ids' | 'movie_ids' | 'series_ids' | 'radio_ids', id: string, checked: boolean) => {
    const currentIds = formData[contentType];
    if (checked) {
      setFormData({
        ...formData,
        [contentType]: [...currentIds, id]
      });
    } else {
      setFormData({
        ...formData,
        [contentType]: currentIds.filter(existingId => existingId !== id)
      });
    }
  };

  const handleFilterChange = (contentType: keyof ContentFilters, filterType: 'category' | 'search', value: string) => {
    setFilters({
      ...filters,
      [contentType]: {
        ...filters[contentType],
        [filterType]: value
      }
    });
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const getTotalContentCount = (bouquet: Bouquet) => {
    return (bouquet.channel_ids?.length || 0) +
           (bouquet.movie_ids?.length || 0) +
           (bouquet.series_ids?.length || 0) +
           (bouquet.radio_ids?.length || 0);
  };

  const renderContentSelectionTab = (
    contentType: 'channels' | 'movies' | 'series' | 'radio',
    items: any[],
    selectedIds: string[],
    nameField: string,
    icon: React.ReactNode,
    formField: 'channel_ids' | 'movie_ids' | 'series_ids' | 'radio_ids'
  ) => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select 
            value={filters[contentType].category} 
            onValueChange={(value) => handleFilterChange(contentType, 'category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories[contentType].map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${contentType}...`}
              value={filters[contentType].search}
              onChange={(e) => handleFilterChange(contentType, 'search', e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Content Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Select {contentType.charAt(0).toUpperCase() + contentType.slice(1)} 
            ({selectedIds.length} selected)
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allIds = filteredContent[contentType].map((item: any) => item.id);
              const allSelected = allIds.every(id => selectedIds.includes(id));
              if (allSelected) {
                setFormData({
                  ...formData,
                  [formField]: selectedIds.filter(id => !allIds.includes(id))
                });
              } else {
                setFormData({
                  ...formData,
                  [formField]: [...new Set([...selectedIds, ...allIds])]
                });
              }
            }}
          >
            Toggle Page
          </Button>
        </div>
        
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                {contentType === 'movies' && <TableHead>Year</TableHead>}
                {contentType === 'series' && <TableHead>Seasons/Episodes</TableHead>}
                {contentType === 'radio' && <TableHead>Frequency</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent[contentType].map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleContentToggle(formField, item.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {icon}
                      {item[nameField]}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  {contentType === 'movies' && (
                    <TableCell>{item.year || 'N/A'}</TableCell>
                  )}
                  {contentType === 'series' && (
                    <TableCell>{item.seasons || 0}S / {item.episodes || 0}E</TableCell>
                  )}
                  {contentType === 'radio' && (
                    <TableCell>{item.frequency || 'N/A'}</TableCell>
                  )}
                </TableRow>
              ))}
              {filteredContent[contentType].length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No {contentType} found matching the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

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
              <Package className="h-5 w-5" />
              Enhanced Bouquet Management
            </CardTitle>
            <CardDescription>Manage channel bouquets with movies, series, and radio stations</CardDescription>
          </div>
          <Button onClick={openAddDialog}>
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
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Tv className="h-4 w-4" />
                    Channels
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Film className="h-4 w-4" />
                    Movies  
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <PlaySquare className="h-4 w-4" />
                    Series
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Radio className="h-4 w-4" />
                    Radio
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bouquets.map((bouquet) => (
                <TableRow key={bouquet.id}>
                  <TableCell>
                    <Badge variant="outline">{bouquet.sort_order}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{bouquet.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {bouquet.description || "No description"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {bouquet.channel_ids?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {bouquet.movie_ids?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {bouquet.series_ids?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {bouquet.radio_ids?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bouquet.is_adult ? (
                      <Badge variant="destructive">Adult</Badge>
                    ) : (
                      <Badge variant="default">General</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(bouquet)}
                        title="Edit Bouquet"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(bouquet)}
                        title="Duplicate Bouquet"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(bouquet.id)}
                        title="Delete Bouquet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {bouquets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No bouquets found. Create your first bouquet to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enhanced Bouquet Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingBouquet ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingBouquet ? "Edit Bouquet" : "Create New Bouquet"}
            </DialogTitle>
            <DialogDescription>
              {editingBouquet ? "Update bouquet information and content selection" : "Create a new comprehensive bouquet with multiple content types"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="movies">Movies</TabsTrigger>
              <TabsTrigger value="series">Series</TabsTrigger>
              <TabsTrigger value="radio">Radio</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="details" className="space-y-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Bouquet Name *</Label>
                    <Input
                      id="name"
                      placeholder="Premium Entertainment"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Premium entertainment package including channels, movies, series and radio stations..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-adult"
                    checked={formData.is_adult}
                    onCheckedChange={(checked) => setFormData({...formData, is_adult: !!checked})}
                  />
                  <Label htmlFor="is-adult">Adult Content Bouquet</Label>
                </div>
              </TabsContent>

              <TabsContent value="channels" className="p-6">
                {renderContentSelectionTab(
                  'channels',
                  filteredContent.channels,
                  formData.channel_ids,
                  'name',
                  <Tv className="h-4 w-4" />,
                  'channel_ids'
                )}
              </TabsContent>

              <TabsContent value="movies" className="p-6">
                {renderContentSelectionTab(
                  'movies',
                  filteredContent.movies,
                  formData.movie_ids,
                  'name',
                  <Film className="h-4 w-4" />,
                  'movie_ids'
                )}
              </TabsContent>

              <TabsContent value="series" className="p-6">
                {renderContentSelectionTab(
                  'series',
                  filteredContent.series,
                  formData.series_ids,
                  'title',
                  <PlaySquare className="h-4 w-4" />,
                  'series_ids'
                )}
              </TabsContent>

              <TabsContent value="radio" className="p-6">
                {renderContentSelectionTab(
                  'radio',
                  filteredContent.radio,
                  formData.radio_ids,
                  'name',
                  <Radio className="h-4 w-4" />,
                  'radio_ids'
                )}
              </TabsContent>

              <TabsContent value="review" className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Bouquet Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Tv className="h-8 w-8 mx-auto mb-2 text-xtream-blue" />
                        <div className="font-semibold">{formData.channel_ids.length}</div>
                        <div className="text-sm text-muted-foreground">Channels</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Film className="h-8 w-8 mx-auto mb-2 text-xtream-orange" />
                        <div className="font-semibold">{formData.movie_ids.length}</div>
                        <div className="text-sm text-muted-foreground">Movies</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <PlaySquare className="h-8 w-8 mx-auto mb-2 text-xtream-navy" />
                        <div className="font-semibold">{formData.series_ids.length}</div>
                        <div className="text-sm text-muted-foreground">Series</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Radio className="h-8 w-8 mx-auto mb-2 text-success" />
                        <div className="font-semibold">{formData.radio_ids.length}</div>
                        <div className="text-sm text-muted-foreground">Radio</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Selected Content Preview</Label>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Show selected channels */}
                          {formData.channel_ids.map(id => {
                            const item = channels.find(c => c.id === id);
                            return item ? (
                              <TableRow key={id}>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Tv className="h-3 w-3" />
                                    Channel
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                              </TableRow>
                            ) : null;
                          })}
                          
                          {/* Show selected movies */}
                          {formData.movie_ids.map(id => {
                            const item = movies.find(m => m.id === id);
                            return item ? (
                              <TableRow key={id}>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Film className="h-3 w-3" />
                                    Movie
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                              </TableRow>
                            ) : null;
                          })}

                          {/* Show selected series */}
                          {formData.series_ids.map(id => {
                            const item = series.find(s => s.id === id);
                            return item ? (
                              <TableRow key={id}>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <PlaySquare className="h-3 w-3" />
                                    Series
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.title}</TableCell>
                                <TableCell>{item.category}</TableCell>
                              </TableRow>
                            ) : null;
                          })}

                          {/* Show selected radio stations */}
                          {formData.radio_ids.map(id => {
                            const item = radioStations.find(r => r.id === id);
                            return item ? (
                              <TableRow key={id}>
                                <TableCell>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Radio className="h-3 w-3" />
                                    Radio
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.category}</TableCell>
                              </TableRow>
                            ) : null;
                          })}

                          {(formData.channel_ids.length + formData.movie_ids.length + formData.series_ids.length + formData.radio_ids.length) === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                No content selected. Use the previous tabs to add content to this bouquet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBouquet ? "Update" : "Create"} Bouquet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};